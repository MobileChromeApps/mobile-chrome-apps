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
var proxy = require('./proxy'),
    server = require('./index'),
    colors = require('colors'),
    express = require('express'),
    hosted = require('./emulate/hosted');

colors.mode = "console";

module.exports = {
    start: function (options) {
        var app = server.start(options);

        if (!options.path) { options.path = [process.cwd()]; }

        if (!options.route) {
            options.route = "/ripple";
        } else if (!options.route.match(/^\//)) {
            options.route = "/" + options.route;
        }

        app = proxy.start({route: options.route}, app);

        // TODO does not work with custom route (since ripple does not dynamically know custom ones, yet, if set)
        app.post("/ripple/user-agent", function (req, res/*, next*/) {
            res.send(200);

            options.userAgent = unescape(req.body.userAgent);

            if (options.userAgent) {
                console.log("INFO:".green + ' Set Device User Agent (String): "' + options.userAgent + '"');
            } else {
                console.log("INFO:".green + ' Using Browser User Agent (String)');
            }
        });

        // TODO: How to make into a dynamic route (using options.route)? (set at build time right now)
        app.use("/ripple/assets", express.static(__dirname + "/../../pkg/hosted"));
        app.use(hosted.inject(options));

        if (!options.remote) {
            options.path.forEach(function (path) {
                app.use("/", express.static(path));
            });
        }

// TODO: This should just talk about how to enable ripple via query params
//        app.use(options.route + "/enable/", express.static(__dirname + "/../../assets/server"));
//
//        console.log();
//        console.log("INFO:".green + " Load the URL below (in Chrome) to auto-enable Ripple.");
//        console.log("      " + ("http://localhost:" + app._port + options.route + "/enable/").cyan);
//        console.log();

        return app;
    }
};
