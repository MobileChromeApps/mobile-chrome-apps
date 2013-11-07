var shell   = require('shelljs'),
    fs      = require('fs'),
    url     = require('url'),
    plugins = require('./util/plugins'),
    xml_helpers = require('./util/xml-helpers'),
    metadata = require('./util/metadata'),
    path    = require('path'),
    Q       = require('q'),
    registry = require('./registry/registry');
// XXX: leave the require('../plugman') because jasmine shits itself if you declare it up top
// possible options: link, subdir, git_ref, client, expected_id
// Returns a promise.
module.exports = function fetchPlugin(plugin_dir, plugins_dir, options) {
    require('../plugman').emit('log', 'Fetching plugin from "' + plugin_dir + '"...');
    // Ensure the containing directory exists.
    shell.mkdir('-p', plugins_dir);

    options = options || {};
    options.subdir = options.subdir || '.';

    // clone from git repository
    var uri = url.parse(plugin_dir);

    // If the hash exists, it has the form from npm: http://foo.com/bar#git-ref[:subdir]
    // NB: No leading or trailing slash on the subdir.
    if (uri.hash) {
        var result = uri.hash.match(/^#([^:]*)(?::\/?(.*?)\/?)?$/);
        if (result) {
            if (result[1])
                options.git_ref = result[1];
            if(result[2])
                options.subdir = result[2];

            // Recurse and exit with the new options and truncated URL.
            var new_dir = plugin_dir.substring(0, plugin_dir.indexOf('#'));
            return fetchPlugin(new_dir, plugins_dir, options);
        }
    }

    if ( uri.protocol && uri.protocol != 'file:' && !plugin_dir.match(/^\w+:\\/)) {
        if (options.link) {
            return Q.reject(new Error('--link is not supported for git URLs'));
        } else {
            var data = {
                source: {
                    type: 'git',
                    url:  plugin_dir,
                    subdir: options.subdir,
                    ref: options.git_ref
                }
            };

            return plugins.clonePluginGitRepo(plugin_dir, plugins_dir, options.subdir, options.git_ref)
            .then(function(dir) {
                return checkID(options, dir);
            })
            .then(function(dir) {
                metadata.save_fetch_metadata(dir, data);
                return dir;
            });
        }
    } else {

        // Copy from the local filesystem.
        // First, read the plugin.xml and grab the ID.
        // NOTE: Can't use uri.href here as it will convert spaces to %20 and make path invalid.
        // Use original plugin_dir value instead.
        plugin_dir = path.join(plugin_dir, options.subdir);

        var linkable = true;
        var movePlugin = function(plugin_dir) {
            var plugin_xml_path = path.join(plugin_dir, 'plugin.xml');
            require('../plugman').emit('verbose', 'Fetch is reading plugin.xml from location "' + plugin_xml_path + '"...');
            var xml = xml_helpers.parseElementtreeSync(plugin_xml_path);
            var plugin_id = xml.getroot().attrib.id;

            var dest = path.join(plugins_dir, plugin_id);

            shell.rm('-rf', dest);
            if (options.link && linkable) {
                require('../plugman').emit('verbose', 'Symlinking from location "' + plugin_dir + '" to location "' + dest + '"');
                fs.symlinkSync(plugin_dir, dest, 'dir');
            } else {
                shell.mkdir('-p', dest);
                require('../plugman').emit('verbose', 'Copying from location "' + plugin_dir + '" to location "' + dest + '"');
                shell.cp('-R', path.join(plugin_dir, '*') , dest);
            }

            var data = {
                source: {
                type: 'local',
                      path: plugin_dir
                }
            };
            metadata.save_fetch_metadata(dest, data);
            return dest;
        };

        if(!fs.existsSync(plugin_dir)) {
            return registry.fetch([plugin_dir], options.client)
            .then(function(dir) {
                linkable = false;
                return movePlugin(dir);
            })
            .then(function(dir) {
                return checkID(options, dir);
            });
        } else {
            return Q(movePlugin(plugin_dir))
            .then(function(dir) {
                return checkID(options, dir);
            });
        }
    }
};

// Helper function for checking expected plugin IDs against reality.
function checkID(options, dir) {
    // Read the plugin.xml file and check the ID matches options.expected_id if set.
    if (options.expected_id) {
        var et = xml_helpers.parseElementtreeSync(path.join(dir, 'plugin.xml'));
        if (et.getroot().attrib.id == options.expected_id) {
            return dir;
        } else {
            return Q.reject(new Error('Expected Fetched plugin to have ID "' + options.expected_id + '" but got "' + et.getroot().attrib.id + '".'));
        }
    }
    return dir;
}
