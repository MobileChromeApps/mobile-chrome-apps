var npm = require('npm'),
    path = require('path'),
    http = require('http'),
    targz = require('tar.gz'),
    fs = require('fs'),
    manifest = require('./manifest'),
    os = require('os'),
    rc = require('rc'),
    home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE,
    plugmanConfigDir = path.resolve(home, '.plugman'),
    plugmanCacheDir = path.resolve(plugmanConfigDir, 'cache');

function handleError(err, cb) {
    if(typeof cb == 'function') {
        return cb(err);
    }
    throw err;
}

/**
 * @method getPackageInfo
 * @param {String} args Package names
 * @param {Function} cb callback 
 */
function getPackageInfo(args, cb) {
    var thing = args.length ? args.shift().split("@") : [],
                              name = thing.shift(),
                              version = thing.join("@");
    
    version = version ? version : 'latest';
    
    var settings = module.exports.settings;
    
    http.get(settings.registry + '/' + name + '/' + version, function(res) {
         if(res.statusCode != 200) {
                 var err = new Error('Error');
                 if (cb) cb(err);
                 else throw err;
         } else {
             var info = '';
             res.on('data', function(chunk) {
                info += chunk;
             });
             res.on('end', function() {
                 cb(null, JSON.parse(info));
             });
         }
    }).on('error', function(err) {
        cb(err); 
    });
}

/**
 * @method fetchPackage
 * @param {String} info Package info 
 * @param {Function} cb callback 
 */
function fetchPackage(info, cb) {
    var settings = module.exports.settings;
    
    var cached = path.resolve(settings.cache, info.name, info.version, 'package');
    if(fs.existsSync(cached)) {
        cb(null, cached);
    } else {
        var target = path.join(os.tmpdir(), info.name);
        var filename = target + '.tgz';
        var filestream = fs.createWriteStream(filename);
        var request = http.get(info.dist.tarball, function(res) {
            if(res.statusCode != 200) {
                var err = new Error('failed to fetch the plugin archive');
                if (cb) cb(err);
                else throw err;
            } else {
                res.pipe(filestream);
                filestream.on('finish', function() {
                    var decompress = new targz().extract(filename, target, function(err) {
                        cb(err, path.resolve(target, 'package'));
                    });
                });
            }
        });
    }
}

module.exports = {
    settings: null,
    /**
     * @method config
     * @param {Array} args Command argument
     * @param {Function} cb Command callback
     */
    config: function(args, cb) {
        initSettings(function(err, settings) {
            if(err) return handleError(err, cb);
            npm.load(settings, function(er) {
                if (er) return handleError(er);
                npm.commands.config(args, cb);
            });
        });
    },
    /**
     * @method adduser
     * @param {Array} args Command argument
     * @param {Function} cb Command callback
     */
    adduser: function(args, cb) {
        initSettings(function(err, settings) {
            if(err) return handleError(err, cb);
            npm.load(settings, function(er) {
                if (er) return handleError(er);
                npm.commands.adduser(args, cb);
            });
        });
    },
    /**
     * @method publish
     * @param {Array} args Command argument
     * @param {Function} cb Command callback
     */
    publish: function(args, cb) {
        initSettings(function(err, settings) {
            if(err) return handleError(err, cb);
            manifest.generatePackageJsonFromPluginXml(args[0]);
            npm.load(settings, function(er) {
                if (er) return handleError(er);
                npm.commands.publish(args, function(err, data) {
                    fs.unlink(path.resolve(args[0], 'package.json'));
                    cb(err, data);
                });
            });
        });
    },
    /**
     * @method search
     * @param {Array} args Array of keywords
     * @param {Function} cb Command callback
     */
    search: function(args, cb) {
        initSettings(function(err, settings) {
            if(err) return handleError(err, cb);
            npm.load(settings, function(er) {
                if (er) return handleError(er, cb);
                npm.commands.search(args, true, cb);
            });
        });
    },
    /**
     * @method unpublish
     * @param {Array} args Command argument
     * @param {Function} cb Command callback
     */
    unpublish: function(args, cb) {
        initSettings(function(err, settings) {
            if(err) return handleError(err, cb);
            npm.load(settings, function(er) {
                if (er) return handlError(er);
                npm.commands.unpublish(args, function(err, d) {
                    if(err) return handleError(err, cb);
                    npm.commands.cache(["clean"], cb);
                });
            });
        });
    },
    /**
     * @method fetch
     * @param {String} name Plugin name
     * @param {Function} cb Command callback
     */
    fetch: function(args, cb) {
        initSettings(function(err, settings) {
            if(err) return handleError(err, cb);
            getPackageInfo(args, function(err, info) {
                if(err) return handleError(err, cb)
                fetchPackage(info, cb);
            });
        });
    }
}

/**
 * @method initSettings
 * @param {Function} cb callback
 */
function initSettings(cb) {
    var settings = module.exports.settings;
    if(typeof cb != 'function') throw new Error('Please provide a callback');
    // check if settings already set
    if(settings != null) return cb(null, settings);
    
    // setting up settings
    // obviously if settings dir does not exist settings is going to be empty
    if(!fs.existsSync(plugmanConfigDir)) {
        fs.mkdirSync(plugmanConfigDir);
        fs.mkdirSync(plugmanCacheDir);
    }

    settings = 
    module.exports.settings =
    rc('plugman', {
         cache: plugmanCacheDir,
         force: true,
         registry: 'http://registry.cordova.io',
         logstream: fs.createWriteStream(path.resolve(plugmanConfigDir, 'plugman.log')),
         userconfig: path.resolve(plugmanConfigDir, 'config')
    });
    cb(null, settings);
}
