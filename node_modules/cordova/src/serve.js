/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/
var cordova_util = require('./util'),
    crypto = require('crypto'),
    path = require('path'),
    shell = require('shelljs'),
    platforms     = require('../platforms'),
    config_parser = require('./config_parser'),
    hooker        = require('./hooker'),
    fs = require('fs'),
    util = require('util'),
    http = require("http"),
    url = require("url"),
    mime = require("mime"),
    zlib = require("zlib");

function launchServer(projectRoot, port) {
    var server = http.createServer(function(request, response) {
        function do404() {
            console.log('404 ' + request.url);
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("404 Not Found\n");
            response.end();
        }
        function do302(where) {
            console.log('302 ' + request.url);
            response.setHeader("Location", where);
            response.writeHead(302, {"Content-Type": "text/plain"});
            response.end();
        }
        function doRoot() {
            response.writeHead(200, {"Content-Type": "text/html"});
            var config = new cordova_util.config_parser(path.join(projectRoot, "www/config.xml"));
            response.write("<html><head><title>"+config.name()+"</title></head><body>");
            response.write("<table border cellspacing=0><thead><caption><h3>Package Metadata</h3></caption></thead><tbody>");
            for (var c in {"name": true, "packageName": true, "version": true}) {
                response.write("<tr><th>"+c+"</th><td>"+config[c]()+"</td></tr>");
            }
            response.write("</tbody></table>");
            response.write("<h3>Platforms</h3><ul>");
            var installed_platforms = cordova_util.listPlatforms(projectRoot);
            for (var p in platforms) {
                if (installed_platforms.indexOf(p) >= 0) {
                    response.write("<li><a href='"+p+"/'>"+p+"</a></li>\n");
                } else {
                    response.write("<li><em>"+p+"</em></li>\n");
                }
            }
            response.write("</ul>");
            response.write("<h3>Plugins</h3><ul>");
            var pluginPath = path.join(projectRoot, 'plugins');
            var plugins = cordova_util.findPlugins(pluginPath);
            for (var p in plugins) {
                response.write("<li>"+plugins[p]+"</li>\n");
            }
            response.write("</ul>");
            response.write("</body></html>");
            response.end();
        }
        var urlPath = url.parse(request.url).pathname;
        var firstSegment = /\/(.*?)\//.exec(urlPath);
        if (!firstSegment) {
            return doRoot();
        }
        var platformId = firstSegment[1];
        if (!platforms[platformId]) {
            return do404();
        }
        // Strip the platform out of the path.
        urlPath = urlPath.slice(platformId.length + 1);

        try {
            var parser = new platforms[platformId].parser(path.join(projectRoot, 'platforms', platformId));
        } catch (e) {
            return do404();
        }
        var filePath = null;

        if (urlPath == '/config.xml') {
            filePath = parser.config_xml();
        } else if (urlPath == '/project.json') {
            processAddRequest(request, response, platformId, projectRoot);
            return;
        } else if (/^\/www\//.test(urlPath)) {
            filePath = path.join(parser.www_dir(), urlPath.slice(5));
        } else if (/^\/+[^\/]*$/.test(urlPath)) {
            return do302("/" + platformId + "/www/");
        } else {
            return do404();
        }

        fs.exists(filePath, function(exists) {
            if (exists) {
                if (fs.statSync(filePath).isDirectory()) {
                    index = path.join(filePath, "index.html");
                    try {
                        if (fs.statSync(index)) {
                            filePath = index;
                        }
                    } catch (e) {}
                }
                if (fs.statSync(filePath).isDirectory()) {
                    if (!/\/$/.test(urlPath)) {
                        return do302("/" + platformId + urlPath + "/");
                    }
                    console.log('200 ' + request.url);
                    response.writeHead(200, {"Content-Type": "text/html"});
                    response.write("<html><head><title>Directory listing of "+ urlPath + "</title></head>");
                    response.write("<h3>Items in this directory</h3>");
                    var items = fs.readdirSync(filePath);
                    response.write("<ul>");
                    for (var i in items) {
                        var file = items[i];
                        if (file) {
                            response.write('<li><a href="'+file+'">'+file+'</a></li>\n');
                        }
                    }
                    response.write("</ul>");
                    response.end();
                } else {
                    var mimeType = mime.lookup(filePath);
                    var respHeaders = {
                      'Content-Type': mimeType
                    };
                    var readStream = fs.createReadStream(filePath);

                    var acceptEncoding = request.headers['accept-encoding'] || '';
                    if (acceptEncoding.match(/\bgzip\b/)) {
                        respHeaders['content-encoding'] = 'gzip';
                        readStream = readStream.pipe(zlib.createGzip());
                    } else if (acceptEncoding.match(/\bdeflate\b/)) {
                        respHeaders['content-encoding'] = 'deflate';
                        readStream = readStream.pipe(zlib.createDeflate());
                    }
                    console.log('200 ' + request.url);
                    response.writeHead(200, respHeaders);
                    readStream.pipe(response);
                }
            } else {
                return do404();
            }
        });

    }).listen(port, undefined, undefined, function (listeningEvent) {
        console.log("Static file server running on port " + port + " (i.e. http://localhost:" + port + ")\nCTRL + C to shut down");
    });
    return server;
}

function calculateMd5(fileName) {
    var BUF_LENGTH = 64*1024,
        buf = new Buffer(BUF_LENGTH),
        bytesRead = BUF_LENGTH,
        pos = 0,
        fdr = fs.openSync(fileName, 'r');

    try {
        var md5sum = crypto.createHash('md5');
        while (bytesRead === BUF_LENGTH) {
            bytesRead = fs.readSync(fdr, buf, 0, BUF_LENGTH, pos);
            pos += bytesRead;
            md5sum.update(buf.slice(0, bytesRead));
        }
    } finally {
        fs.closeSync(fdr);
    }
    return md5sum.digest('hex');
}

function processAddRequest(request, response, platformId, projectRoot) {
    var parser = new platforms[platformId].parser(path.join(projectRoot, 'platforms', platformId));
    var wwwDir = parser.www_dir();
    var payload = {
        'configPath': '/' + platformId + '/config.xml',
        'wwwPath': '/' + platformId + '/www',
        'wwwFileList': shell.find(wwwDir)
            .filter(function(a) { return !fs.statSync(a).isDirectory() && !/(^\.)|(\/\.)/.test(a) })
            .map(function(a) { return {'path': a.slice(wwwDir.length), 'etag': '' + calculateMd5(a)}; })
    };
    console.log('200 ' + request.url);
    response.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
    });
    response.write(JSON.stringify(payload));
    response.end();
}

module.exports = function server(port) {
    var projectRoot = cordova_util.cdProjectRoot();
    port = +port || 8000;

    var hooks = new hooker(projectRoot);
    return hooks.fire('before_serve')
    .then(function() {
        // Run a prepare first!
        return require('../cordova').raw.prepare([]);
    }).then(function() {
        launchServer(projectRoot, port);
        return hooks.fire('after_serve');
    });
};

