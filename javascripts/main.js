var mqtt;
var reconnectTimeout = 2000;
var chartsData = {};
var charts = {};
var pushes = {};
var t2index = {}; //key names for secondary graphs
var clickCounts = {};
var testPanelID; //last panel to appear is targeted for testing

function MQTTconnect() {
    displayStatus("Connecting...", "info");

    if (typeof path == "undefined") {
        path = '/mqtt';
    }

    mqtt = new Paho.MQTT.Client(
        host,
        port,
        path,
        "web_" + parseInt(Math.random() * 100, 10)
    );

    var options = {
        timeout: 3,
        useSSL: useTLS,
        cleanSession: cleansession,
        onSuccess: onConnect,
        onFailure: function (message) {
            displayStatus("Connection failed: " + message.errorMessage + "Retrying", "danger");
            setTimeout(MQTTconnect, reconnectTimeout);
        }
    };

    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;

    if (username != null) {
        options.userName = username;
        options.password = password;
    }
    console.log("Host=" + host + ", port=" + port + ", path=" + path + " TLS = " + useTLS + " username=" + username + " password=" + password);
    mqtt.connect(options);
}

function displayStatus(statusText, statusType) {
    var statusDisplay = '<div class="alert alert-' + statusType + '" role="alert">' + statusText + '</div>';
    $('#status-display').html(statusDisplay);
}

function onConnect() {
    displayStatus('Connected to ' + host + ':' + port + path, "success");
    // Connection succeeded; subscribe to our topic
    mqtt.subscribe(topic, {
        qos: 0
    });
}

function onConnectionLost(response) {
    setTimeout(MQTTconnect, reconnectTimeout);
    displayStatus("connection lost: " + response.errorMessage + ". Reconnecting", "warning");
    console.log("connection lost: " + response.errorMessage + ". Reconnecting", "warning");
};

function onMessageArrived(message) {
    var topic = message.destinationName;
    var payload = message.payloadString;
    if (topic == 'nodemcu/sensor') {
        var data = JSON.parse(payload);
        var keys = Object.keys(data);
        keys.sort();
        var panelid = '#heading-' + data['chipid'];
        if ($(panelid).length) {
            // Panel exists update panel
            updatePanel(data['chipid'], data);
            updateGraph(data['chipid'], data);
        } else {
            // Panel does not exist add new panel
            testPanelID = data['chipid'];
            $('#sensorpanels').prepend(newPanel(data['chipid'], data['dht22_humi']));
            createTempGraph(data['chipid']);
            countClicks(data['chipid']);
        }
    };
};

// Read clicks history from the log
function countClicks(panelID) {
    $.getJSON("http://sandbox.6aika.fi/mqttlogs/" + panelID + "-event.json").done(function (data) {
        //var incomingData = jQuery.parseJSON(data);
        pushes[panelID] = 0;
        $.each(data, function (idx, obj) {
            if (obj.event == 'close_6') pushes[panelID]++;
        });
        buttonUp(panelID);
    }).fail(function (jqxhr, textStatus, error) {
        //var clickCounter = '#pushes-' + panelID + ' .push-count';
        pushes[panelID] = -1;
        buttonUp(panelID);
        //$(clickCounter).html("0");
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err + " chart:" + panelID + " = " + charts[panelID]);
    });
}

function createTempGraph(panelID) {
    chartsData[panelID] = {
        series: [{
            data: []
        },{
            data: []
        }]
    };
    $.getJSON("http://sandbox.6aika.fi/mqttlogs/" + panelID + "-sensor.json").done(function (data) {
        data.sort(function(a, b){
            var keyA = new Date(a.timestamp),
                keyB = new Date(b.timestamp);
            // Compare the 2 dates
            if(keyA < keyB) return -1;
            if(keyA > keyB) return 1;
            return 0;
        });
        // Find if secondary sensor is present and its key
        t2index[panelID] = "";

        $.each(data[0], function (key, value) {
            if (key.indexOf("DS28-") == 0) {
                t2index[panelID] = key;
            }
        });

        $.each(data, function (idx, obj) {

            var datum1 = {
                x: moment(obj.timestamp).valueOf(),
                y: obj.dht22_temp
            };
            chartsData[panelID].series[0].data.push(datum1);

            if (t2index[panelID] != "") {
                var datum2 = {
                    x: moment(obj.timestamp).valueOf(),
                    y: obj[t2index[panelID]]
                };
                chartsData[panelID].series[1].data.push(datum2);
            }

        });
        //console.log("DATA FOR NEW GRAPH #"+panelID+" = " + JSON.stringify(chartsData[panelID]));
        var graphContainer = '#graph-' + panelID;
        $(graphContainer).html("");
        //chartsData[panelID] = newChartData;
        charts[panelID] = new Chartist.Line(graphContainer, chartsData[panelID], {
            fullWidth: true,
            showPoint: false,
            chartPadding: {
                right: 40
            },
            axisX: {
                type: Chartist.FixedScaleAxis,
                divisor: 6,
                labelInterpolationFnc: function (value) {
                    return moment(value).format('hh:mm:ss');
                }
            },
            axisY: {
                onlyInteger: true
            }
        });
    }).fail(function (jqxhr, textStatus, error) {
        charts[panelID] = false;
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err + " chart:" + panelID + " = " + charts[panelID]);
    });
}

function updatePanel(panelID, data) {
    //update Keypresses
    if (data['event']=="open_6") {
        buttonDown(panelID);
    }
    if (data['event']=="close_6") {
        buttonUp(panelID);
    }
    var headerIcon = $('#heading-' + panelID);
    headerIcon.toggleClass('is-updated');
    //update Humidity
    var humContainer = $('#humidity-' + panelID);
    humContainer.html(data['dht22_humi']);
}

function updateGraph(panelID, datas) {
    //update Temperature
    //graph exists update graph
    //console.log("trying to update chart: " + panelID + " = " + charts[panelID]);
    if (charts[panelID]) {
        var cleantime = moment(datas['timestamp']);
        var datum = {
            x: cleantime.valueOf(),
            y: datas['dht22_temp']
        };
        chartsData[panelID].series[0].data.shift();
        chartsData[panelID].series[0].data.push(datum);

        if (t2index[panelID] != "") {
            var datum2 = {
                x: cleantime.valueOf(),
                y: datas[t2index[panelID]]
            };
            chartsData[panelID].series[1].data.shift();
            chartsData[panelID].series[1].data.push(datum2);
        }
        charts[panelID].update();
        //console.log(JSON.stringify(chartsData[panelID]));
    }
    //graph has failed earlier create new graph
    else {
        createTempGraph(panelID);
    }
}

function buttonUp(panelID) {
    var pushContainer = $('#pushes-' + panelID + ' .push-count');
    var pushGraph = $('#heading-' + panelID + ' .push-graph');
    var pushWidth = pushes[panelID] + '%';
    pushes[panelID]++;
    pushContainer.html(pushes[panelID]);
    pushGraph.width(pushWidth);
    $('#pushes-'+panelID).removeClass("is-down");
}

function buttonDown(panelID) {
    $('#pushes-'+panelID).addClass("is-down");
}

function newPanel(panelID, humidity) {
    // Panel header
    var theNewPanel = '<div class="col-xs-12"><div class="panel"><div class="panel-heading clearfix" role="tab" id="heading-';
    theNewPanel += panelID;
    theNewPanel += '"><div class="row"><div class="col-sm-3"><h5 class="panel-title">';
    theNewPanel += '<a role="button" data-toggle="collapse" data-parent="#accordion" href="#collapse-';
    theNewPanel += panelID;
    theNewPanel += '" aria-expanded="true" aria-controls="collapse-';
    theNewPanel += panelID;
    theNewPanel += '"><svg class="sensor-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 207.23 229.55"><title>sensor-icon</title><path d="M144.51,118.94q9.35,0,9.35,9.58,0,9.35-9.35,9.35-9.58,0-9.58-9.35Q134.93,118.94,144.51,118.94Z"/><path d="M144.51,147.44q9.35,0,9.35,9.58,0,9.35-9.35,9.35-9.58,0-9.58-9.35Q134.93,147.44,144.51,147.44Z"/><path d="M144.51,175.94q9.35,0,9.35,9.58,0,9.35-9.35,9.35-9.58,0-9.58-9.35Q134.93,175.94,144.51,175.94Z"/><path d="M123.86,158q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q123.85,167.36,123.86,158Z"/><path d="M175.23,215.91a27,27,0,0,0,8.22-20V119.94a27.09,27.09,0,0,0-8.22-20.08c-5.47-5.47-12.25-8-20.3-8h-107c-8.06,0-14.81,2.52-20.28,8a27.08,27.08,0,0,0-8.2,20.08v75.92a27,27,0,0,0,8.2,20c5.47,5.47,12.22,8,20.28,8h107C163,223.86,169.76,221.38,175.23,215.91Zm-127.3-10A9.43,9.43,0,0,1,41,203a9.88,9.88,0,0,1-2.57-7.17V119.94a10,10,0,0,1,2.57-7.2,9.45,9.45,0,0,1,6.9-2.87h107a9.51,9.51,0,0,1,6.93,2.87,10,10,0,0,1,2.6,7.2v75.92a9.91,9.91,0,0,1-2.6,7.17,9.5,9.5,0,0,1-6.93,2.83Z"/><path d="M95.36,158q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q95.35,167.36,95.36,158Z"/><path d="M95.36,186.52q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q95.35,195.86,95.36,186.52Z"/><path d="M66.86,186.52q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q66.85,195.86,66.86,186.52Z"/><path d="M66.86,158q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q66.85,167.36,66.86,158Z"/><path d="M66.86,129.52q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q66.85,138.86,66.86,129.52Z"/><path d="M95.36,129.52q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q95.35,138.86,95.36,129.52Z"/><path d="M123.86,129.52q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q123.85,138.86,123.86,129.52Z"/><path d="M112.86,77.52q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q112.85,86.86,112.86,77.52Z"/><path d="M123.86,186.52q0-9.58-9.35-9.58-9.58,0-9.58,9.58,0,9.35,9.58,9.35Q123.85,195.86,123.86,186.52Z"/><path d="M143.94,42.72a9.07,9.07,0,0,1-6.62-2.85,46,46,0,0,0-33.65-13.8A46,46,0,0,0,70,39.86a9,9,0,0,1-6.73,2.79,9.61,9.61,0,0,1-6.73-2.79,9.23,9.23,0,0,1,0-13.35A65.06,65.06,0,0,1,86.44,9.23a66.34,66.34,0,0,1,34.28,0,65.07,65.07,0,0,1,29.95,17.28,9.23,9.23,0,0,1,0,13.35A9.21,9.21,0,0,1,143.94,42.72Z"/><path d="M83.48,62.91a9.52,9.52,0,0,1-6.73-16.31,37.1,37.1,0,0,1,17.11-9.87,38.14,38.14,0,0,1,19.62,0,37.12,37.12,0,0,1,17.11,9.87,9.52,9.52,0,1,1-13.46,13.46,19,19,0,0,0-26.92,0A9.21,9.21,0,0,1,83.48,62.91Z"/></svg>';
    theNewPanel += panelID;
    theNewPanel += '</a></h5></div><div class="col-sm-9">';
    theNewPanel += '<div class="push-counter-wrapper clearfix"><div class="push-graph" style="width: 0%"></div><div class="push-counter" id="pushes-';
    theNewPanel += panelID;
    theNewPanel += '"><span class="push-count">///</span><svg class="press-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 207.23 229.55"><title>press-icon</title><path d="M100,208.68a27.53,27.53,0,0,0,8.22-20.27v-5.92A26.58,26.58,0,0,0,100,162.63c-5.47-5.47-12.25-7.77-20.3-7.77h-37c-8.06,0-14.81,2.29-20.28,7.77a26.56,26.56,0,0,0-8.2,19.85v5.92A28,28,0,0,0,42.7,216.86h37A27.57,27.57,0,0,0,100,208.68Zm-57.3-9.81a9.61,9.61,0,0,1-6.9-3.06,10.45,10.45,0,0,1-2.57-7.4v-5.92a9.41,9.41,0,0,1,2.57-7,9.29,9.29,0,0,1,6.9-2.64h37a9,9,0,0,1,9.52,9.62v5.92a10.48,10.48,0,0,1-2.6,7.4,9.68,9.68,0,0,1-6.93,3.06Z"/><path d="M94.23,151.82a200.54,200.54,0,0,1-28.94,18.63,23.29,23.29,0,0,1-18.21,1.73A23.46,23.46,0,0,1,31.4,142.46,23.28,23.28,0,0,1,43.11,128.4Q54,122.64,58.84,115.84A62.44,62.44,0,0,0,67,98.23Q52.83,95.87,46.33,83.55a27.54,27.54,0,0,1-2.06-21.79,27.55,27.55,0,0,1,14-16.82l50.54-26.66a28.49,28.49,0,0,1,38.6,11.94,28,28,0,0,1,2.28,20l2.47.76q8.16,3.71,20.09,16.28a117.63,117.63,0,0,1,19,25.92q8.53,16.17,9.85,29.95l.38,3.16a25.69,25.69,0,0,1-2.12,13.13,26.58,26.58,0,0,1-8.6,11.13l-47.35,32.22A21.75,21.75,0,0,1,129.61,187a19.61,19.61,0,0,1-13.25-5Q111.57,177.82,94.23,151.82Zm87.55-19.7a7.39,7.39,0,0,0,.79-3.39l-.39-3.67q-1.15-10.51-7.76-23a95.55,95.55,0,0,0-15.59-21.23Q149,70.47,144.15,68.12q-3.82-1.86-8.68.7L93.42,91q-5.25,2.77-8,11.73-2,6.48-3.51,10.25a88.89,88.89,0,0,1-5.2,10.23,47.15,47.15,0,0,1-9.86,11.92,75.74,75.74,0,0,1-14.86,10,4.8,4.8,0,0,0,4.48,8.49,193.62,193.62,0,0,0,33.85-23l10.54-8.92,4.25,12q2.65,4,12.36,18T129,167.83q1.35,1.09,3.16-.38l47.35-32.22A7.28,7.28,0,0,0,181.79,132.13ZM117.66,35.06,67.12,61.72a9.6,9.6,0,0,0,9,17L126.62,52a8.86,8.86,0,0,0,4.53-5.62,9.66,9.66,0,0,0-6.29-11.93A8.84,8.84,0,0,0,117.66,35.06Z"/></svg></div></div>';
    theNewPanel += '';
    theNewPanel += '</div>';
    // Panel body
    theNewPanel += '</div></div><div id="collapse-';
    theNewPanel += panelID;
    theNewPanel += '" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="heading-';
    theNewPanel += panelID;
    theNewPanel += '"><div class="panel-body sensor-panel">';
    theNewPanel += '<div class="col-sm-10"><h5>Temperature</h5>';
    theNewPanel += '<div class="iot-graph ct-chart ct-major-twelfth" id="graph-';
    theNewPanel += panelID;
    theNewPanel += '"><div class="well">Fetching temperature data</div></div></div>';
    theNewPanel += '<div class="col-sm-2"><h5>Humidity</h5><div class="humidity-wrapper"><h1><span id="humidity-';
    theNewPanel += panelID;
    theNewPanel += '">';
    theNewPanel += humidity;
    theNewPanel += '</span><small>%</small></h1></div></div>';
    theNewPanel += '</div></div></div></div>';
    return theNewPanel;
}

$(document).ready(function () {
    MQTTconnect();
});

$("body").keydown(function(){
    buttonDown(testPanelID);
});

$("body").keyup(function(){
    buttonUp(testPanelID);
});
