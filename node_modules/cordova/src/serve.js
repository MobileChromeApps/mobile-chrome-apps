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
    fs = require('fs'),
    util = require('util'),
    http = require("http"),
    url = require("url");

function launch_server(www, platform_www, config_xml_path, port) {
    port = port || 8000;

    // Searches these directories in order looking for the requested file.
    var searchPath = [platform_www];

    var server = http.createServer(function(request, response) {
        var uri = url.parse(request.url).pathname;

        function checkPath(pathIndex) {
            if (searchPath.length <= pathIndex) {
                response.writeHead(404, {"Content-Type": "text/plain"});
                response.write("404 Not Found\n");
                response.end();
                return;
            }

            var filename = path.join(searchPath[pathIndex], uri);
            if(uri === "/config.xml"){
                filename = config_xml_path;
            }

            fs.exists(filename, function(exists) {
                if(!exists) {
                    checkPath(pathIndex+1);
                    return;
                }

                if (fs.statSync(filename).isDirectory()) filename += path.sep + 'index.html';

                fs.readFile(filename, "binary", function(err, file) {
                    if(err) {
                        response.writeHead(500, {"Content-Type": "text/plain"});
                        response.write(err + "\n");
                        response.end();
                        return;
                    }

                    response.writeHead(200);
                    response.write(file, "binary");
                    response.end();
                });
            });
        }
        checkPath(0);
    }).listen(parseInt(''+port, 10));

    console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
    return server;
}

module.exports = function serve (platform, port) {
    var returnValue = {};

    module.exports.config(platform, port, function (config) {
        returnValue.server = launch_server(config.paths[0], config.paths[1], config.config_xml_path, port);
    });

    // Hack for testing despite its async nature.
    return returnValue;
};

module.exports.config = function (platform, port, callback) {
    var projectRoot = cordova_util.isCordova(process.cwd());

    if (!projectRoot) {
        throw new Error('Current working directory is not a Cordova-based project.');
    }

    var xml = cordova_util.projectConfig(projectRoot);
    var cfg = new config_parser(xml);

    // Retrieve the platforms.
    var platformList = cordova_util.listPlatforms(projectRoot);
    if (!platform) {
        throw new Error('You need to specify a platform.');
    } else if (platformList.length == 0) {
        throw new Error('No platforms to serve.');
    } else if (platformList.filter(function(x) { return x == platform }).length == 0) {
        throw new Error(platform + ' is not an installed platform.');
    }

    // If we got to this point, the given platform is valid.

    var result = {
        paths: [],
        // Config file path
        config_xml_path : "",
        // Default port is 8000 if not given. This is also the default of the Python module.
        port: port || 8000
    };

    // Top-level www directory.
    result.paths.push(cordova_util.projectWww(projectRoot));

    var parser = new platforms[platform].parser(path.join(projectRoot, 'platforms', platform));

    // Update the related platform project from the config
    parser.update_project(cfg, function() {
        result.paths.push(parser.www_dir());
        result.config_xml_path = parser.config_xml();
        callback(result);
    });
}
