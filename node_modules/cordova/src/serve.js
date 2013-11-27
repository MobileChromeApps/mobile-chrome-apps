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
        var urlPath = url.parse(request.url).pathname;
        var firstSegment = /\/(.*?)\//.exec(urlPath);
        if (!firstSegment) {
            return do404();
        }
        var platformId = firstSegment[1];
        if (!platforms[platformId]) {
            return do404();
        }
        // Strip the platform out of the path.
        urlPath = urlPath.slice(platformId.length + 1);

        var parser = new platforms[platformId].parser(path.join(projectRoot, 'platforms', platformId));
        var filePath = null;

        if (urlPath == '/config.xml') {
            filePath = parser.config_xml();
        } else if (urlPath == '/project.json') {
            processAddRequest(request, response, platformId, projectRoot);
            return;
        } else if (/^\/www\//.test(urlPath)) {
            filePath = path.join(parser.www_dir(), urlPath.slice(5));
        } else {
            return do404();
        }

        fs.exists(filePath, function(exists) {
            if (exists) {
                if (fs.statSync(filePath).isDirectory()) {
                    console.log('200 ' + request.url);
                    response.writeHead(200, {"Content-Type": "text/plain"});
                    response.write("TODO: show a directory listing.\n");
                    response.end();
                } else {
                    var mimeType = mime.lookup(filePath);
                    var respHeaders = {
                      'Content-Type': mimeType
                    };
                    var readStream = fs.createReadStream(filePath);

                    var acceptEncoding = request.headers['accept-encoding'] || '';
                    if (acceptEncoding.match(/\bdeflate\b/)) {
                        respHeaders['content-encoding'] = 'deflate';
                        readStream = readStream.pipe(zlib.createDeflate());
                    } else if (acceptEncoding.match(/\bgzip\b/)) {
                        respHeaders['content-encoding'] = 'gzip';
                        readStream = readStream.pipe(zlib.createGzip());
                    }
                    console.log('200 ' + request.url);
                    response.writeHead(200, respHeaders);
                    readStream.pipe(response);
                }
            } else {
                return do404();
            }
        });

    }).listen(port);

    console.log("Static file server running at\n  => http://0.0.0.0:" + port + "/\nCTRL + C to shutdown");
    return server;
}

function processAddRequest(request, response, platformId, projectRoot) {
    var parser = new platforms[platformId].parser(path.join(projectRoot, 'platforms', platformId));
    var wwwDir = parser.www_dir();
    var payload = {
        'configPath': '/' + platformId + '/config.xml',
        'wwwPath': '/' + platformId + '/www',
        'wwwFileList': shell.find(wwwDir)
            .filter(function(a) { return !fs.statSync(a).isDirectory() && !/(^\.)|(\/\.)/.test(a) })
            .map(function(a) { return a.slice(wwwDir.length); })
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
    var projectRoot = cordova_util.isCordova(process.cwd());
    port = +port || 8000;

    if (!projectRoot) {
        throw new Error('Current working directory is not a Cordova-based project.');
    }

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

