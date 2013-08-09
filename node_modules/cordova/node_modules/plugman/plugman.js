/*
 *
 * Copyright 2013 Anis Kadri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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

// copyright (c) 2013 Andrew Lunny, Adobe Systems

var emitter = require('./src/events');

plugman = {
    help:               require('./src/help'),
    install:            require('./src/install'),
    uninstall:          require('./src/uninstall'),
    fetch:              require('./src/fetch'),
    prepare:            require('./src/prepare'),
    config:             require('./src/config'), 
    adduser:            require('./src/adduser'),
    publish:            require('./src/publish'),
    unpublish:          require('./src/unpublish'),
    search:             require('./src/search'),
    config_changes:     require('./src/util/config-changes'),
    on:                 emitter.addListener,
    off:                emitter.removeListener,
    removeAllListeners: emitter.removeAllListeners,
    emit:               emitter.emit
};

plugman.commands =  {
    'config'   : function(cli_opts) {
        plugman.config(cli_opts.argv.remain);
    },
    'install'  : function(cli_opts) {
        if(!cli_opts.platform || !cli_opts.project || !cli_opts.plugin) {
            return console.log(plugman.help());
        }
        var cli_variables = {}
        if (cli_opts.variable) {
            cli_opts.variable.forEach(function (variable) {
                    var tokens = variable.split('=');
                    var key = tokens.shift().toUpperCase();
                    if (/^[\w-_]+$/.test(key)) cli_variables[key] = tokens.join('=');
                    });
        }
        var opts = {
            subdir: '.',
            cli_variables: cli_variables,
            www_dir: cli_opts.www
        };
        plugman.install(cli_opts.platform, cli_opts.project, cli_opts.plugin, cli_opts.plugins_dir, opts);
    },
    'uninstall': function(cli_opts) {
        if(!cli_opts.platform || !cli_opts.project || !cli_opts.plugin) {
            return console.log(plugman.help());
        }
        plugman.uninstall(cli_opts.platform, cli_opts.project, cli_opts.plugin, cli_opts.plugins_dir, { www_dir: cli_opts.www });
    },
    'adduser'  : function(cli_opts) {
        plugman.adduser();
    },

    'search'   : function(cli_opts) {
        plugman.search(cli_opts.argv.remain);
    },

    'publish'  : function(cli_opts) {
        var plugin_path = cli_opts.argv.remain; 
        if(!plugin_path) {
            return console.log(plugman.help());
        }
        plugman.publish(plugin_path);
    },

    'unpublish': function(cli_opts) {
        var plugin = cli_opts.argv.remain; 
        if(!plugin) {
            return console.log(plugman.help());
        }
        plugman.unpublish(plugin);
    }
};

module.exports = plugman;
