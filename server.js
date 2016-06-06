var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    mustache = require("./lib/mustache"),
    keyprocessor = require("./lib/keyprocessor"),
    sysinfo = require('./lib/sysinfo'),
    port = process.env.PORT || 8888;

var errCount = 0;
var proxyHost, proxyPort;

if (process.env['http_proxy']) {
  proxyHost = url.parse(process.env['http_proxy']).hostname 
  proxyPort = url.parse(process.env['http_proxy']).port
}

var exampleHost = 'example.com'
var requestOptions = {
  host: proxyHost || exampleHost,
  port: proxyPort || 80,
  path: process.env['http_proxy'] ? exampleHost : '',
  headers: process.env['http_proxy'] ? {Host: exampleHost} : {}
}

function checkExample(){
  var req = http.get(requestOptions, function(response){
    errCount = 0;
    setTimeout(checkExample, 1000)
  }).on('error', function(err) {
    console.log('An error occurred');
    errCount += 1;
    if (errCount == 3) process.exit(1);
    setTimeout(checkExample, 1000)
  }).on('timeout', function(err) {
    console.log('A timeout occurred');
    errCount += 1;
    if (errCount == 3) process.exit(1);
    setTimeout(checkExample, 1000)
  });
  req.setTimeout(1000);
}

checkExample();

http.createServer(function(request, response) {

    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    fs.exists(filename, function(exists) {
        if (!exists) {
            response.writeHead(404, {
                "Content-Type": "text/plain"
            });
            response.write("404 Not Found\n");
            response.end();
            return;
        }

        if (uri == "/") {
            var t = path.join(filename, '/index.html');
            var v = {
                env: [],
                sys: sysinfo.sysInfo()
            };
            for (var item in process.env) {
                v['env'].push({
                    'key': item,
                    'value': keyprocessor.procKey(item, process.env[item])
                });
            }

            fs.readFile(t, 'utf8', function(err, data) {
                var html = mustache.to_html(data, v);
                response.writeHead(200);
                response.end(html, "binary");
                return;
            });
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

        fs.readFile(filename, "binary", function(err, file) {
            if (err) {
                response.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                response.write(err + "\n");
                response.end();
                return;
            }
            if (uri.match(/css$/)) {
                response.writeHead(200, {
                    "Content-Type": "text/css"
                });
            } else {
                response.writeHead(200);
            }
            response.end(file, "binary");
        });
    });
}).listen(parseInt(port, 10));

console.log("Server running at\n  => http://0.0.0.0:" + port + "/\nCTRL + C to shutdown");
