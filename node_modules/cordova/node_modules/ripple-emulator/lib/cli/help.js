/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */

var fs = require('fs'),
    path = require('path'),
    colors = require('colors');

colors.mode = "console";

function style(command) {
    var raw = fs.readFileSync(path.join(__dirname, '..', '..', 'doc', 'cli', command + ".md")).toString('utf8').split("\n");

    return raw.map(function (line) {
        if (line.match(/^# /)) {
            return line.replace(/^# /, '').magenta;
        }
        else if (line.match(/^## /)) {
            return line.replace(/^## /, '').magenta;
        }
        else if (line.match(/^ {4}/)) {
            return line.green;
        }
        else if (line.match("What does it all mean?")) {
            return line.rainbow + "\n" + line.rainbow;
        }
        return '    ' + line;
    }).join("\n");
}

function help(command) {
    var text;

    try {
        text = style(command || "ripple");
    }
    catch (e) {
        console.log(("Could not find help file for: " + command).red.bold);
        console.log();
        text = style("ripple");
    }

    console.log(text);
}

module.exports = {
    call: help
};
