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
var fs = require('fs'),
    colors = require('colors'),
    events = require('./events'),
    path = require('path');

module.exports = function help () {
    var raw = fs.readFileSync(path.join(__dirname, '..', 'doc', 'help.txt')).toString('utf8').split("\n");
    events.emit('results', raw.map(function(line) {
        if (line.match('    ')) {
            var prompt = '    $ ',
                isPromptLine = !(!(line.indexOf(prompt) != -1));
            if (isPromptLine) {
                return prompt.green + line.replace(prompt, '');
            }
            else {
                return line.split(/\./g).map( function(char) { 
                    if (char === '') {
                        return '.'.grey;
                    }
                    else {
                        return char;
                    }
                }).join('');
            }
        }
        else {
            return line.magenta;
        }
    }).join("\n"));
};
