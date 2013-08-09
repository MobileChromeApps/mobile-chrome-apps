var optimist  = require('optimist'),
    cordova   = require('../cordova'),
    plugman   = require('plugman'),
    platforms = require("../platforms");

module.exports = function CLI(args) {
    args = optimist(args)
        .boolean('d')
        .boolean('verbose')
        .boolean('v')
        .boolean('version')
        .argv;

    if (args.v || args.version) {
        return console.log(require('../package').version);
    }

    var tokens = args._.slice(2),
        opts = {
            platforms: [],
            options: [],
            verbose: (args.d || args.verbose)
        },
        cmd = tokens && tokens.length ? tokens[0] : undefined;

    // provide clean output on exceptions rather than dumping a stack trace
    process.on('uncaughtException', function(err){
        if (opts.verbose) {
            console.error(err.stack);
        } else {
            console.error(err);
        }
        process.exit(1);
    });
    cordova.on('results', console.log);

    if (opts.verbose) {
        cordova.on('log', console.log);
        cordova.on('warn', console.warn);
        plugman.on('log', console.log);
        plugman.on('warn', console.warn);
    }

    if (cmd === undefined) {
        return cordova.help();
    }

    tokens = tokens.slice(1);
    if (cordova.hasOwnProperty(cmd)) {
        if (cmd == 'emulate' || cmd == 'build' || cmd == 'prepare' || cmd == 'compile' || cmd == 'run') {
            // Filter all non-platforms into options
            tokens.forEach(function(option, index) {
                if (platforms.hasOwnProperty(option)) {
                    opts.platforms.push(option);
                } else {
                    opts.options.push(option);
                }
            });
            cordova[cmd].call(this, opts);
        } else if (cmd == 'create' || cmd == 'serve') {
            cordova[cmd].apply(this, tokens);
        } else {
            // platform/plugins add/rm [target(s)]
            var invocation = tokens.slice(0,1); // this has the sub-command, i.e. "platform add" or "plugin rm"
            var targets = tokens.slice(1); // this should be an array of targets, be it platforms or plugins
            invocation.push(targets);
            cordova[cmd].apply(this, invocation);
        }
    } else {
        throw new Error('Cordova does not know ' + cmd + '; try help for a list of all the available commands.');
    }
}
