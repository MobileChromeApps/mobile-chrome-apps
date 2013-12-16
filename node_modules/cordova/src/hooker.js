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
var util  = require('./util'),
    fs    = require('fs'),
    os    = require('os'),
    events= require('./events'),
    child_process = require('child_process'),
    Q     = require('q'),
    path  = require('path'),
    _ = require('lodash');

module.exports = function hooker(root) {
    var r = util.isCordova(root);
    if (!r) throw new Error('Not a Cordova project, can\'t use hooks.');
    else this.root = r;
};

// Returns a promise.
module.exports.fire = function global_fire(hook, opts) {
    opts = opts || {};
    var handlers = events.listeners(hook);
    return execute_handlers_serially(handlers, opts);
};

function compareNumbers(a, b) {
    return isNaN (parseInt(a))
        ? a.toLowerCase().localeCompare(b.toLowerCase ? b.toLowerCase(): b)
        : parseInt(a) > parseInt(b) ? 1 : parseInt(a) < parseInt(b) ? -1 : 0;
}

module.exports.prototype = {
    // Returns a promise.
    fire:function fire(hook, opts) {
        opts = opts || {};
        var self = this;
        var dir = path.join(this.root, '.cordova', 'hooks', hook);
        opts.root = this.root;

        // Fire JS hook for the event
        // These ones need to "serialize" events, that is, each handler attached to the event needs to finish processing (if it "opted in" to the callback) before the next one will fire.
        var handlers = events.listeners(hook);
        return execute_handlers_serially(handlers, opts)
        .then(function() {
            // Fire script-based hooks
            if (!(fs.existsSync(dir))) {
                return Q(); // hooks directory got axed post-create; ignore.
            } else {
                var scripts = fs.readdirSync(dir).sort(compareNumbers).filter(function(s) {
                    return s[0] != '.';
                });
                return execute_scripts_serially(scripts, self.root, dir, opts);
            }
        });
    }
};

// Returns a promise.
function execute_scripts_serially(scripts, root, dir, opts) {
    opts = opts || {};
    if (scripts.length) {
        var s = scripts.shift();
        var fullpath = path.join(dir, s);
        if (fs.statSync(fullpath).isDirectory()) {
            events.emit('verbose', 'skipped directory "' + fullpath + '" within hook directory');
            return execute_scripts_serially(scripts, root, dir, opts); // skip directories if they're in there.
        } else {
            var command = fullpath + ' "' + root + '"';

            var hookFd = fs.openSync(fullpath, "r");
            // this is a modern cluster size. no need to read less
            var fileData = new Buffer (4096);
            var octetsRead = fs.readSync(hookFd, fileData, 0, 4096, 0);
            var fileChunk = fileData.toString();

            var hookCmd, shMatch;
            var shebangMatch = fileChunk.match(/^#!(\/usr\/bin\/env )?([^\r\n]+)/m);
            if (octetsRead == 4096 && !fileChunk.match(/[\r\n]/))
                events.emit('warn', 'shebang is too long for "' + fullpath + '"');
            if (shebangMatch)
                hookCmd = shebangMatch[2];
            if (hookCmd)
                shMatch = hookCmd.match(/bin\/((ba)?sh)$/)
            if (shMatch)
                hookCmd = shMatch[1]

            // according to the http://www.microsoft.com/resources/documentation/windows/xp/all/proddocs/en-us/wsh_runfromwindowsbasedhost.mspx?mfr=true
            // win32 cscript natively supports .wsf, .vbs, .js extensions
            // also, cmd.exe supports .bat files
            // .ps1 powershell http://technet.microsoft.com/en-us/library/ee176949.aspx
            var sExt = path.extname(s);

            if (sExt.match(/^.(bat|wsf|vbs|js|ps1)$/)) {
                if (os.platform() != 'win32' && !hookCmd) {
                    events.emit('verbose', 'hook file "' + fullpath + '" skipped');
                    // found windows script, without shebang this script definitely
                    // will not run on unix
                    return execute_scripts_serially(scripts, root, dir, opts);
                }
            }

            if (os.platform() == 'win32' && hookCmd) {
                // we have shebang, so try to run this script using correct interpreter
                command = hookCmd + ' ' + command;
            }

            var execOpts = {cwd: root};
            execOpts.env = _.extend({}, process.env);
            execOpts.env.CORDOVA_VERSION = require('../package').version;
            execOpts.env.CORDOVA_PLATFORMS = opts.platforms ? opts.platforms.join() : '';
            execOpts.env.CORDOVA_PLUGINS = opts.plugins?opts.plugins.join():'';
            execOpts.env.CORDOVA_HOOK = fullpath;
            execOpts.env.CORDOVA_CMDLINE = process.argv.join(' ');

            events.emit('verbose', 'Executing hook "' + command + '" (output to follow)...');
            var d = Q.defer();
            child_process.exec(command, execOpts, function(err, stdout, stderr) {
                events.emit('verbose', stdout, stderr);
                if (err) {
                    d.reject(new Error('Script "' + fullpath + '" exited with non-zero status code. Aborting. Output: ' + stdout + stderr));
                } else {
                    d.resolve(execute_scripts_serially(scripts, root, dir, opts));
                }
            });
            return d.promise;
        }
    } else {
        return Q(); // Nothing to do.
    }
}

// Returns a promise.
function execute_handlers_serially(handlers, opts) {
    if (handlers.length) {
        // Chain the handlers in series.
        return handlers.reduce(function(soFar, f) {
            return soFar.then(function() { return f(opts) });
        }, Q());
    } else {
        return Q(); // Nothing to do.
    }
}
