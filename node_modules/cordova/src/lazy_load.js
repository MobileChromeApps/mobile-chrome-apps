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
var path          = require('path'),
    fs            = require('fs'),
    shell         = require('shelljs'),
    platforms     = require('../platforms'),
    npmconf       = require('npmconf'),
    events        = require('./events'),
    request       = require('request'),
    config        = require('./config'),
    hooker        = require('./hooker'),
    zlib          = require('zlib'),
    tar           = require('tar'),
    URL           = require('url'),
    Q             = require('q'),
    util          = require('./util');

module.exports = {
    // Returns a promise for the path to the lazy-loaded directory.
    cordova:function lazy_load(platform) {
        if (!(platform in platforms)) {
            return Q.reject(new Error('Cordova library "' + platform + '" not recognized.'));
        }

        var url = platforms[platform].url + ';a=snapshot;h=' + platforms[platform].version + ';sf=tgz';
        return module.exports.custom(url, 'cordova', platform, platforms[platform].version);
    },
    // Returns a promise for the path to the lazy-loaded directory.
    custom:function(url, id, platform, version) {
        var download_dir;
        var tmp_dir;
        var lib_dir;

        // Return early for already-cached remote URL, or for local URLs.
        var uri = URL.parse(url);
        var isUri = uri.protocol && uri.protocol[1] != ':'; // second part of conditional is for awesome windows support. fuuu windows
        if (isUri) {
            download_dir = (platform == 'wp7' || platform == 'wp8' ? path.join(util.libDirectory, 'wp', id, version) :
                                                                     path.join(util.libDirectory, platform, id, version));
            lib_dir = platforms[platform] && platforms[platform].subdirectory && platform !== "blackberry10" ? path.join(download_dir, platforms[platform].subdirectory) : download_dir;
            if (fs.existsSync(download_dir)) {
                events.emit('verbose', id + ' library for "' + platform + '" already exists. No need to download. Continuing.');
                return Q(lib_dir);
            }
        } else {
            // Local path.
            lib_dir = platforms[platform] && platforms[platform].subdirectory ? path.join(url, platforms[platform].subdirectory) : url;
            return Q(lib_dir);
        }
        return hooker.fire('before_library_download', {
            platform:platform,
            url:url,
            id:id,
            version:version
        }).then(function() {
            var uri = URL.parse(url);
            var d = Q.defer();
            npmconf.load(function(err, conf) {
                // Check if NPM proxy settings are set. If so, include them in the request() call.
                var proxy;
                if (uri.protocol == 'https:') {
                    proxy = conf.get('https-proxy');
                } else if (uri.protocol == 'http:') {
                    proxy = conf.get('proxy');
                }

                // Create a tmp dir. Using /tmp is a problem because it's often on a different partition and sehll.mv()
                // fails in this case with "EXDEV, cross-device link not permitted".
                tmp_subidr = 'tmp_' + id + '_' + process.pid + '_' + (new Date).valueOf();
                tmp_dir = path.join(util.libDirectory, 'tmp', tmp_subidr);
                shell.rm('-rf', tmp_dir);
                shell.mkdir('-p', tmp_dir);

                var size = 0;
                var request_options = {uri:url};
                if (proxy) {
                    request_options.proxy = proxy;
                }
                events.emit('verbose', 'Requesting ' + JSON.stringify(request_options) + '...');
                events.emit('log', 'Downloading ' + id + ' library for ' + platform + '...');
                var req = request.get(request_options, function(err, res, body) {
                    if (err) {
                        shell.rm('-rf', tmp_dir);
                        d.reject(err);
                    } else if (res.statusCode != 200) {
                        shell.rm('-rf', tmp_dir);
                        d.reject(new Error('HTTP error ' + res.statusCode + ' retrieving version ' + version + ' of ' + id + ' for ' + platform));
                    } else {
                        size = body.length;
                    }
                });

                req.pipe(zlib.createUnzip())
                .pipe(tar.Extract({path:tmp_dir}))
                .on('error', function(err) {
                    shell.rm('-rf', tmp_dir);
                    d.reject(err);
                })
                .on('end', function() {
                    events.emit('verbose', 'Downloaded, unzipped and extracted ' + size + ' byte response.');
                    events.emit('log', 'Download complete');
                    var entries = fs.readdirSync(tmp_dir);
                    var entry = path.join(tmp_dir, entries[0]);
                    shell.mkdir('-p', download_dir);
                    shell.mv('-f', path.join(entry, (platform=='blackberry10'?'blackberry10':''), '*'), download_dir);
                    shell.rm('-rf', tmp_dir);
                    d.resolve(hooker.fire('after_library_download', {
                        platform:platform,
                        url:url,
                        id:id,
                        version:version,
                        path: lib_dir,
                        size:size,
                        symlink:false
                    }));
                });
            });
            return d.promise.then(function () { return lib_dir; });
        });
    },
    // Returns a promise for the path to the lazy-loaded directory.
    based_on_config:function(project_root, platform) {
        var custom_path = config.has_custom_path(project_root, platform);
        if (custom_path) {
            var dot_file = config.read(project_root);
            return module.exports.custom(dot_file.lib[platform].uri, dot_file.lib[platform].id, platform, dot_file.lib[platform].version);
        } else {
            return module.exports.cordova(platform);
        }
    }
};
