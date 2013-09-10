var path = require('path'),
    fs   = require('fs'),
    et   = require('elementtree'),
    shell= require('shelljs'),
    config_changes = require('./util/config-changes'),
    xml_helpers = require('./util/xml-helpers'),
    action_stack = require('./util/action-stack'),
    n = require('ncallbacks'),
    dependencies = require('./util/dependencies'),
    underscore = require('underscore'),
    platform_modules = require('./platforms');

// possible options: cli_variables, www_dir
module.exports = function(platform, project_dir, id, plugins_dir, options, callback) {
    module.exports.uninstallPlatform(platform, project_dir, id, plugins_dir, options, function(err) {
        if (err) {
            if (callback) return callback(err);
            else throw err;
        }
        module.exports.uninstallPlugin(id, plugins_dir, callback);
    });
}

module.exports.uninstallPlatform = function(platform, project_dir, id, plugins_dir, options, callback) {
    if (!platform_modules[platform]) {
        var err = new Error(platform + " not supported.");
        if (callback) return callback(err);
        else throw err;
    }

    var plugin_dir = path.join(plugins_dir, id);

    if (!fs.existsSync(plugin_dir)) {
        var err = new Error('Plugin "' + id + '" not found. Already uninstalled?');
        if (callback) return callback(err);
        else throw err;
    }

    var current_stack = new action_stack();

    options.is_top_level = true;
    runUninstall(current_stack, platform, project_dir, plugin_dir, plugins_dir, options, callback);
};

module.exports.uninstallPlugin = function(id, plugins_dir, callback) {
    var plugin_dir = path.join(plugins_dir, id);
    // If already removed, skip.
    if (!fs.existsSync(plugin_dir)) {
        if (callback) callback();
        return;
    }
    var xml_path     = path.join(plugin_dir, 'plugin.xml')
      , plugin_et    = xml_helpers.parseElementtreeSync(xml_path);

    require('../plugman').emit('log', 'Removing plugin ' + id + '...');
    // Check for dependents
    var dependencies = plugin_et.findall('dependency');
    if (dependencies && dependencies.length) {
        require('../plugman').emit('log', 'Dependencies detected, iterating through them and removing them first...');
        var end = n(dependencies.length, function() {
            shell.rm('-rf', plugin_dir);
            require('../plugman').emit('log', id + ' removed.');
            if (callback) callback();
        });
        dependencies.forEach(function(dep) {
            module.exports.uninstallPlugin(dep.attrib.id, plugins_dir, end);
        });
    } else {
        // axe the directory
        shell.rm('-rf', plugin_dir);
        require('../plugman').emit('results', 'Deleted "' + plugin_dir + '".');
        if (callback) callback();
    }
};

// possible options: cli_variables, www_dir, is_top_level
function runUninstall(actions, platform, project_dir, plugin_dir, plugins_dir, options, callback) {
    var xml_path     = path.join(plugin_dir, 'plugin.xml')
      , plugin_et    = xml_helpers.parseElementtreeSync(xml_path);
    var plugin_id    = plugin_et._root.attrib['id'];
    options = options || {};

    var dependency_info = dependencies.generate_dependency_info(plugins_dir, platform);
    var graph = dependency_info.graph;
    var dependents = graph.getChain(plugin_id);

    var tlps = dependency_info.top_level_plugins;
    var diff_arr = [];
    tlps.forEach(function(tlp) {
        if (tlp != plugin_id) {
            var ds = graph.getChain(tlp);
            if (options.is_top_level && ds.indexOf(plugin_id) > -1) {
                var err = new Error('Another top-level plugin (' + tlp + ') relies on plugin ' + plugin_id + ', therefore aborting uninstallation.');
                if (callback) return callback(err);
                else throw err;
            }
            diff_arr.push(ds);
        }
    });

    // if this plugin has dependencies, do a set difference to determine which dependencies are not required by other existing plugins
    diff_arr.unshift(dependents);
    var danglers = underscore.difference.apply(null, diff_arr);
    if (dependents.length && danglers && danglers.length) {
        require('../plugman').emit('log', 'Uninstalling ' + danglers.length + ' dangling dependent plugins...');
        var end = n(danglers.length, function() {
            handleUninstall(actions, platform, plugin_id, plugin_et, project_dir, options.www_dir, plugins_dir, plugin_dir, options.is_top_level, callback);
        });
        danglers.forEach(function(dangler) {
            var dependent_path = path.join(plugins_dir, dangler);
            var opts = {
                www_dir: options.www_dir,
                cli_variables: options.cli_variables,
                is_top_level: false /* TODO: should this "is_top_level" param be false for dependents? */
            };
            runUninstall(actions, platform, project_dir, dependent_path, plugins_dir, opts, end);
        });
    } else {
        // this plugin can get axed by itself, gogo!
        handleUninstall(actions, platform, plugin_id, plugin_et, project_dir, options.www_dir, plugins_dir, plugin_dir, options.is_top_level, callback);
    }
}

function handleUninstall(actions, platform, plugin_id, plugin_et, project_dir, www_dir, plugins_dir, plugin_dir, is_top_level, callback) {
    var platform_modules = require('./platforms');
    var handler = platform_modules[platform];
    var platformTag = plugin_et.find('./platform[@name="'+platform+'"]');
    www_dir = www_dir || handler.www_dir(project_dir);
    require('../plugman').emit('log', 'Uninstalling ' + plugin_id + '...');

    var assets = plugin_et.findall('./asset');
    if (platformTag) {
        var sourceFiles = platformTag.findall('./source-file'),
            headerFiles = platformTag.findall('./header-file'),
            libFiles = platformTag.findall('./lib-file'),
            resourceFiles = platformTag.findall('./resource-file');
        assets = assets.concat(platformTag.findall('./asset'));

        // queue up native stuff
        sourceFiles && sourceFiles.forEach(function(source) {
            actions.push(actions.createAction(handler["source-file"].uninstall, [source, project_dir, plugin_id], handler["source-file"].install, [source, plugin_dir, project_dir, plugin_id]));
        });

        headerFiles && headerFiles.forEach(function(header) {
            actions.push(actions.createAction(handler["header-file"].uninstall, [header, project_dir, plugin_id], handler["header-file"].install, [header, plugin_dir, project_dir, plugin_id]));
        });

        resourceFiles && resourceFiles.forEach(function(resource) {
            actions.push(actions.createAction(handler["resource-file"].uninstall, [resource, project_dir], handler["resource-file"].install, [resource, plugin_dir, project_dir]));
        });

        libFiles && libFiles.forEach(function(source) {
            actions.push(actions.createAction(handler["lib-file"].uninstall, [source, project_dir, plugin_id], handler["lib-file"].install, [source, plugin_dir, project_dir, plugin_id]));
        });
    }

    // queue up asset installation
    var common = require('./platforms/common');
    assets && assets.forEach(function(asset) {
        actions.push(actions.createAction(common.asset.uninstall, [asset, www_dir, plugin_id], common.asset.install, [asset, plugin_dir, www_dir]));
    });

    // run through the action stack
    actions.process(platform, project_dir, function(err) {
        if (err) {
            if (callback) callback(err);
            else throw err;
        } else {
            // WIN!
            require('../plugman').emit('results', plugin_id + ' uninstalled.');
            // queue up the plugin so prepare can remove the config changes
            config_changes.add_uninstalled_plugin_to_prepare_queue(plugins_dir, path.basename(plugin_dir), platform, is_top_level);
            // call prepare after a successful uninstall
            require('./../plugman').prepare(project_dir, platform, plugins_dir);
            if (callback) callback();
        }
    });
}
