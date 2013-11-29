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
var cordova_util  = require('./util'),
    shell         = require('shelljs'),
    path          = require('path'),
    fs            = require('fs'),
    Q             = require('q'),
    events        = require('./events');

/*
    A utility funciton to help output the information needed
    when submitting a help request.

    Outputs to a file
*/
module.exports = function info() {

    //Get the template
    var projectRoot = cordova_util.cdProjectRoot();

    var raw = fs.readFileSync(path.join(__dirname, '..', 'doc', 'info.txt'), 'utf-8').split("\n"),
        output;

    output = raw.map(function(line) {
        if(line.match('    %') ) {
            var type = line.substr(5),
                out = "";

            switch(type) {
            case "Node":
                out = shell.exec('node --version',{silent:true}).output;
                break;
            case "Cordova":
                out = require('../package').version;
                break;
            case "Config":
                out = fs.readFileSync( cordova_util.projectConfig(projectRoot) );
                break;
            case "Platforms":
                out = doPlatforms( projectRoot );
                break;
            case "Plugins":
                out = doPlugins( projectRoot );
                break;
            default:
                break;
            }
            return line.replace( "%"+type, out );
        } else {
            return line;
        }
    }).join("\n");

    // /*
    //     Write to File;
    // */
    events.emit('results', output);
    fs.writeFileSync('info.txt', output );
    return Q();
};

function doPlatform( currentPlatform ) {
    var output = "";
    switch( currentPlatform ){
    case "ios":
        output = shell.exec('xcodebuild -version',{silent:true} ).output;
        break;
    case "android":
        output = shell.exec('android list target',{silent:true} ).output;
    }

    return output;
}

function doPlatforms( projectRoot ){
    var platforms = cordova_util.listPlatforms(projectRoot);

    if( platforms.length ) {

        var raw = fs.readFileSync(path.join(__dirname, '..', 'doc', 'platforms.txt')).toString('utf8').split("\n"),
            output = "",
            i;

        for(i=0; i<platforms.length; i++){
            output += raw.map(function(line) {
                if(line.match('    %') ) {
                    var type = line.substr(5),
                        out = "";

                    switch(type) {
                    case "OtherGoodies":
                        out = doPlatform( platforms[ i ] );
                        break;
                    case "Platform":
                        out = platforms[ i ];
                        break;
                    default:
                        break;
                    }
                        return line.replace( "%"+type, out );
                    } else {
                        return line.magenta;
                }
            }).join("\n");
        }

        return output;
    } else {
        return "No Platforms Currently Installed";
    }
}

function doPlugins( projectRoot ){
    var pluginPath = path.join(projectRoot, 'plugins'),
        plugins = cordova_util.findPlugins(pluginPath);

    if( !plugins.length ) {
        return "No Plugins Currently Installed";
    } else {
        return plugins;
    }
}
