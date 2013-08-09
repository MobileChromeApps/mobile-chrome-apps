var shell   = require('shelljs'),
    fs      = require('fs'),
    url     = require('url'),
    plugins = require('./util/plugins'),
    xml_helpers = require('./util/xml-helpers'),
    metadata = require('./util/metadata'),
    path    = require('path'),
    registry = require('./registry/registry');
// XXX: leave the require('../plugman') because jasmine shits itself if you declare it up top
// possible options: link, subdir, git_ref
module.exports = function fetchPlugin(plugin_dir, plugins_dir, options, callback) {
    require('../plugman').emit('log', 'Fetching plugin from location "' + plugin_dir + '"...');
    // Ensure the containing directory exists.
    shell.mkdir('-p', plugins_dir);

    options = options || {};
    options.subdir = options.subdir || '.';

    // clone from git repository
    var uri = url.parse(plugin_dir);
    if ( uri.protocol && uri.protocol != 'file:' && !plugin_dir.match(/^\w+:\\/)) {
        if (options.link) {
            var err = new Error('--link is not supported for git URLs');
            if (callback) return callback(err);
            else throw err;
        } else {
            var data = {
                source: {
                    type: 'git',
                    url:  plugin_dir,
                    subdir: options.subdir,
                    ref: options.git_ref
                }
            };

            plugins.clonePluginGitRepo(plugin_dir, plugins_dir, options.subdir, options.git_ref, function(err, dir) {
                if (err) {
                    if (callback) callback(err);
                    else throw err;
                } else {
                    metadata.save_fetch_metadata(dir, data);
                    if (callback) callback(null, dir);
                }
            });
        }
    } else {

        // Copy from the local filesystem.
        // First, read the plugin.xml and grab the ID.
        // NOTE: Can't use uri.href here as it will convert spaces to %20 and make path invalid.
        // Use original plugin_dir value instead.
        plugin_dir = path.join(plugin_dir, options.subdir);

        var movePlugin = function(plugin_dir, linkable) {
            var plugin_xml_path = path.join(plugin_dir, 'plugin.xml');
            require('../plugman').emit('log', 'Fetch is reading plugin.xml from location "' + plugin_xml_path + '"...');
            var xml = xml_helpers.parseElementtreeSync(plugin_xml_path);
            var plugin_id = xml.getroot().attrib.id;

            var dest = path.join(plugins_dir, plugin_id);

            shell.rm('-rf', dest);
            if (options.link && linkable) {
                require('../plugman').emit('log', 'Symlinking from location "' + plugin_dir + '" to location "' + dest + '"');
                fs.symlinkSync(plugin_dir, dest, 'dir');
            } else {
                shell.mkdir('-p', dest);
                require('../plugman').emit('log', 'Copying from location "' + plugin_dir + '" to location "' + dest + '"');
                shell.cp('-R', path.join(plugin_dir, '*') , dest);
            }

            var data = {
                source: {
                type: 'local',
                      path: plugin_dir
                }
            };
            metadata.save_fetch_metadata(dest, data);

            if (callback) callback(null, dest);
        };

        
        if(!fs.existsSync(plugin_dir)) {
            registry.fetch([plugin_dir], function(err, plugin_dir) {
                if (err) {
                    if(callback) {
                        return callback(err);
                    } else {
                         throw err;
                    }
                }
                movePlugin(plugin_dir, false);
            });
        } else {
          movePlugin(plugin_dir, true);
        }
    }
};
