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
    npm           = require('npm'),
    events        = require('./events'),
    request       = require('request'),
    config        = require('./config'),
    hooker        = require('./hooker'),
    https         = require('follow-redirects').https,
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
        var download_dir = (platform == 'wp7' || platform == 'wp8' ? path.join(util.libDirectory, 'wp', id, version) :
                                                                     path.join(util.libDirectory, platform, id, version));

        var lib_dir = platforms[platform] && platforms[platform].subdirectory && platform !== "blackberry10" ? path.join(download_dir, platforms[platform].subdirectory) : download_dir;

        if (fs.existsSync(download_dir)) {
            events.emit('verbose', id + ' library for "' + platform + '" already exists. No need to download. Continuing.');
            return Q(lib_dir);
        }
        try {
            // readlinkSync throws if download_dir points to a non-existent file.
            var dangling = fs.readlinkSync(download_dir);
            return Q.reject(download_dir + " points to non-existent or unreadable location: " + dangling);
        } catch (e) {}
        events.emit('log', 'Installing ' + id + ' library for ' + platform + '...');
        return hooker.fire('before_library_download', {
            platform:platform,
            url:url,
            id:id,
            version:version
        }).then(function() {
            var uri = URL.parse(url);
            var d = Q.defer();
            if (uri.protocol && uri.protocol[1] != ':') { // second part of conditional is for awesome windows support. fuuu windows
                npm.load(function() {
                    // Check if NPM proxy settings are set. If so, include them in the request() call.
                    var proxy;
                    if (uri.protocol == 'https:') {
                        proxy = npm.config.get('https-proxy');
                    } else if (uri.protocol == 'http:') {
                        proxy = npm.config.get('proxy');
                    }

                    shell.mkdir('-p', download_dir);
                    var size = 0;
                    var request_options = {uri:url};
                    if (proxy) {
                        request_options.proxy = proxy;
                    }
                    events.emit('verbose', 'Requesting ' + JSON.stringify(request_options) + '...');
                    events.emit('log', 'Downloading ' + id + ' library for ' + platform + '...');
                    var req = request.get(request_options, function(err, res, body) {
                        if (err) {
                            shell.rm('-rf', download_dir);
                            d.reject(err);
                        } else if (res.statusCode != 200) {
                            shell.rm('-rf', download_dir);
                            d.reject(new Error('HTTP error ' + res.statusCode + ' retrieving version ' + version + ' of ' + id + ' for ' + platform));
                        } else {
                            size = body.length;
                        }
                    });

                    req.pipe(zlib.createUnzip())
                    .pipe(tar.Extract({path:download_dir}))
                    .on('error', function(err) {
                        shell.rm('-rf', download_dir);
                        d.reject(err);
                    })
                    .on('end', function() {
                        events.emit('verbose', 'Downloaded, unzipped and extracted ' + size + ' byte response.');
                        events.emit('log', 'Download complete');
                        var entries = fs.readdirSync(download_dir);
                        var entry = path.join(download_dir, entries[0]);
                        shell.mv('-f', path.join(entry, (platform=='blackberry10'?'blackberry10':''), '*'), download_dir);
                        shell.rm('-rf', entry);
                        events.emit('log', 'Installing ' + id + ' library for ' + platform + '...');
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
            } else {
                // Local path.
                // Do nothing here; users of this code should be using the returned path.
                download_dir = uri.protocol && uri.protocol[1] == ':' ? uri.href : uri.path;
                lib_dir = platforms[platform] && platforms[platform].subdirectory ? path.join(download_dir, platforms[platform].subdirectory) : download_dir;

                events.emit('log', 'Installing ' + id + ' library for ' + platform + '...');
                d.resolve(hooker.fire('after_library_download', {
                    platform:platform,
                    url:url,
                    id:id,
                    version:version,
                    path: lib_dir,
                    symlink:false
                }));
            }
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
