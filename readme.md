![screenshot](/screenshot.png?raw=true "Data display")

# Demo Display for *DataBusiness Cleantech and the Iot* event

Demo page for displaying real time sensor data using [MQTT messaging protocol](http://mqtt.org/).

## Installing

####The build of the static html page is available in [gh-pages branch](https://github.com/terotic/databusiness-iot/tree/gh-pages)

####Steps to build the html page from the source using [Middleman](https://github.com/middleman/middleman)

1. Fork, clone or download this project
2. Install [Bundler](http://bundler.io/) if not already installed: `gem install bundler`
3. Install dependencies: `bundle install`
4. Install [Bower](https://bower.io/) if not already installed: `npm install -g bower`
5. Install dependencies: `bower install`
6. Build site from source: `bundle exec middleman build`


## Developing

To serve site locally during development at http://localhost:4567 use 

`bundle exec middleman server`


## Licensing

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.