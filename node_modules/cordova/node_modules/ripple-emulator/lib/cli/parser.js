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
var FLAG_PREFIX = /^\-\-?/,
    maps = {};

function parse(args) {
    var result = {
            commands: [],
            options: {},
        },
        i;

    // remove ['node', 'script_name']
    args = args.slice(2);

    function collectFlagValues(startAt) {
        var done = false,
            values;

        values = args.slice(startAt).reduce(function (prev, current) {
            if (!done && !current.match(FLAG_PREFIX)) {
                prev.push(current);
                i++;
            } else {
                done = true;
            }

            return prev;
        }, []);

        return values.length > 1 ? values : values[0];
    }

    // note: this for loop is explicitly used so `i` can be modified outside of it
    for (i = 0; i < args.length; i++) {
        if (args[i].match(FLAG_PREFIX)) {
            result.options[args[i].replace(FLAG_PREFIX, "")] = (args[i + 1] && !args[i + 1].match(FLAG_PREFIX)) ?
                                                        collectFlagValues(i + 1) : true;
        }
        else {
            result.commands.push(args[i]);
        }
    }

    Object.keys(result.options).forEach(function (key) {
        if (maps[key]) {
            result.options[key] = maps[key](result.options[key]);
        }
    });

    return result;
}

module.exports = {
    parse: parse,
    map: function (key, func) {
        maps[key] = func;
    }
};
