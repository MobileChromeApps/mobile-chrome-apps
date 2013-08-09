var path = require('path'),
    fs   = require('fs'),
    et   = require('elementtree'),
    n    = require('ncallbacks'),
    action_stack = require('./util/action-stack'),
    shell = require('shelljs'),
    semver = require('semver'),
    config_changes = require('./util/config-changes'),
    xml_helpers = require('./util/xml-helpers'),
    platform_modules = require('./platforms');

/* INSTALL FLOW
   ------------
   There are four functions install "flows" through. Here is an attempt at
   providing a high-level logic flow overview.
   1. module.exports (installPlugin)
     a) checks that the platform is supported
     b) invokes possiblyFetch
   2. possiblyFetch
     a) checks that the plugin is fetched. if so, calls runInstall
     b) if not, invokes plugman.fetch, and when done, calls runInstall
   3. runInstall
     a) checks if the plugin is already installed. if so, calls back (done).
     b) if possible, will check the version of the project and make sure it is compatible with the plugin (checks <engine> tags)
     c) makes sure that any variables required by the plugin are specified. if they are not specified, plugman will throw or callback with an error.
     d) if dependencies are listed in the plugin, it will recurse for each dependent plugin and call possiblyFetch (2) on each one. When each dependent plugin is successfully installed, it will then proceed to call handleInstall (4)
   4. handleInstall
     a) queues up actions into a queue (asset, source-file, headers, etc)
     b) processes the queue
     c) calls back (done)
*/

// possible options: subdir, cli_variables, www_dir
module.exports = function installPlugin(platform, project_dir, id, plugins_dir, options, callback) {
    if (!platform_modules[platform]) {
        var err = new Error(platform + " not supported.");
        if (callback) return callback(err);
        else throw err;
    }

    var current_stack = new action_stack();

    options.is_top_level = true;
    possiblyFetch(current_stack, platform, project_dir, id, plugins_dir, options, callback);
};

// possible options: subdir, cli_variables, www_dir, git_ref, is_top_level
function possiblyFetch(actions, platform, project_dir, id, plugins_dir, options, callback) {
    var plugin_dir = path.join(plugins_dir, id);

    // Check that the plugin has already been fetched.
    if (!fs.existsSync(plugin_dir)) {
        // if plugin doesnt exist, use fetch to get it.
        require('../plugman').fetch(id, plugins_dir, { link: false, subdir: options.subdir, git_ref: options.git_ref }, function(err, plugin_dir) {
            if (err) {
                if (callback) callback(err);
                else throw err;
            } else {
                // update ref to plugin_dir after successful fetch, via fetch callback
                runInstall(actions, platform, project_dir, plugin_dir, plugins_dir, options, callback);
            }
        });
    } else {
        runInstall(actions, platform, project_dir, plugin_dir, plugins_dir, options, callback);
    }
}

// possible options: cli_variables, www_dir, is_top_level
function runInstall(actions, platform, project_dir, plugin_dir, plugins_dir, options, callback) {
    var xml_path     = path.join(plugin_dir, 'plugin.xml')
      , plugin_et    = xml_helpers.parseElementtreeSync(xml_path)
      , filtered_variables = {};
    var name         = plugin_et.findall('name').text;
    var plugin_id    = plugin_et.getroot().attrib['id'];
    require('../plugman').emit('log', 'Starting installation of "' + plugin_id + '"...');

    // check if platform has plugin installed already.
    var platform_config = config_changes.get_platform_json(plugins_dir, platform);
    var plugin_basename = path.basename(plugin_dir);
    var is_installed = false;
    Object.keys(platform_config.installed_plugins).forEach(function(installed_plugin_id) {
        if (installed_plugin_id == plugin_id) {
            is_installed = true;
        }
    });
    Object.keys(platform_config.dependent_plugins).forEach(function(installed_plugin_id) {
        if (installed_plugin_id == plugin_id) {
            is_installed = true;
        }
    });
    if (is_installed) {
        require('../plugman').emit('results', 'Plugin "' + plugin_id + '" already installed, \'sall good.');
        if (callback) callback();
        return;
    }

    // checking engine
    // will there be a case for multiple engine support?
    var versionPath = path.join(project_dir, 'cordova', 'version');
    // windows8, wp7, wp8 all use a .bat file
    if (!fs.existsSync(versionPath)) {
        versionPath += ".bat";
    }
    if (fs.existsSync(versionPath)) {
        // need to rethink this so I don't have to chmod anything
        fs.chmodSync(versionPath, '755');
        var versionScript = shell.exec(versionPath, {silent: true});
        // Only check cordova version if the version script was successful.
        if (versionScript.code === 0) {
            var current_version = versionScript.output.trim();
            var rc_index = current_version.indexOf('rc');
            if (rc_index > -1) {
                current_version = current_version.substr(0, rc_index) + '-' + current_version.substr(rc_index);
            }
            var engines = plugin_et.findall('engines/engine');
            engines.forEach(function(engine){
                if(engine.attrib["name"].toLowerCase() === "cordova"){
                    var engineVersion = engine.attrib["version"];
                    // clean only versionScript.output since semver.clean strips out
                    // the gt and lt operators
                    if(current_version == 'dev' || semver.satisfies(current_version, engineVersion)){
                        // engine ok!
                    } else {
                        var err = new Error('Plugin doesn\'t support this project\'s Cordova version. Project version: ' + current_version + ', failed version requirement: ' + engineVersion);
                        if (callback) return callback(err);
                        else throw err;
                    }
                } else {
                    // check for other engines? worklight phonegap etc
                }
            });
        }
    } else {
        require('../plugman').emit('log', 'Cordova project version not detected (lacks a ./cordova/version script), continuing.');
    }

    // checking preferences, if certain variables are not provided, we should throw.
    prefs = plugin_et.findall('./preference') || [];
    prefs = prefs.concat(plugin_et.findall('./platform[@name="'+platform+'"]/preference'));
    var missing_vars = [];
    prefs.forEach(function (pref) {
        var key = pref.attrib["name"].toUpperCase();
        options.cli_variables = options.cli_variables || {};
        if (options.cli_variables[key] == undefined)
            missing_vars.push(key)
        else
            filtered_variables[key] = options.cli_variables[key]
    });
    if (missing_vars.length > 0) {
        var err = new Error('Variable(s) missing: ' + missing_vars.join(", "));
        if (callback) callback(err);
        else throw err;
        return;
    }

    // Check for dependencies, (co)recurse to install each one
    var dependencies = plugin_et.findall('dependency') || [];
    dependencies = dependencies.concat(plugin_et.findall('./platform[@name="'+platform+'"]/dependency'));
    if (dependencies && dependencies.length) {
        require('../plugman').emit('log', 'Dependencies detected, iterating through them...');
        var end = n(dependencies.length, function() {
            handleInstall(actions, plugin_id, plugin_et, platform, project_dir, plugins_dir, plugin_basename, plugin_dir, filtered_variables, options.www_dir, options.is_top_level, callback);
        });
        dependencies.forEach(function(dep) {
            var dep_plugin_id = dep.attrib.id;
            var dep_subdir = dep.attrib.subdir;
            var dep_url = dep.attrib.url;
            var dep_git_ref = dep.attrib.commit;
            if (dep_subdir) {
                dep_subdir = path.join.apply(null, dep_subdir.split('/'));
            }

            // Handle relative dependency paths by expanding and resolving them.
            // The easy case of relative paths is to have a URL of '.' and a different subdir.
            // TODO: Implement the hard case of different repo URLs, rather than the special case of
            // same-repo-different-subdir.
            if (dep_url == '.') {
                // Look up the parent plugin's fetch metadata and determine the correct URL.
                var fetchdata = require('./util/metadata').get_fetch_metadata(plugin_dir);

                if (!fetchdata || !(fetchdata.source && fetchdata.source.type)) {
                    var err = new Error('No fetch metadata found for ' + plugin_id + '. Cannot install relative dependencies.');
                    if (callback) callback(err);
                    throw err;
                    return;
                }

                // Now there are two cases here: local directory, and git URL.
                if (fetchdata.source.type === 'local') {
                    dep_url = fetchdata.source.path;

                    var old_pwd = shell.pwd();
                    shell.cd(dep_url);
                    var result = shell.exec('git rev-parse --show-toplevel', { silent:true, async:false});
                    if (result.code === 128) {
                        var err = new Error('Error: Plugin ' + plugin_id + ' is not in git repository. All plugins must be in a git repository.');
                        if (callback) return callback(err);
                        else throw err;
                    } else if(result.code > 0) {
                        var err = new Error('Error trying to locate git repository for plugin.');
                        if (callback) return callback(err);
                        else throw err;
                    }

                    var dep_url = path.join(result.output.trim(), dep_subdir);
                    //Clear out the subdir since the url now contains it
                    dep_subdir = "";
                    shell.cd(old_pwd);
                } else if (fetchdata.source.type === 'git') {
                    dep_url = fetchdata.source.url;
                }
            }

            var dep_plugin_dir = path.join(plugins_dir, dep_plugin_id);
            if (fs.existsSync(dep_plugin_dir)) {
                require('../plugman').emit('log', 'Dependent plugin "' + dep_plugin_id + '" already fetched, using that version.');
                var opts = {
                    cli_variables: filtered_variables,
                    www_dir: options.www_dir,
                    is_top_level: false
                };
                runInstall(actions, platform, project_dir, dep_plugin_dir, plugins_dir, opts, end);
            } else {
                require('../plugman').emit('log', 'Dependent plugin "' + dep_plugin_id + '" not fetched, retrieving then installing.');
                var opts = {
                    cli_variables: filtered_variables,
                    www_dir: options.www_dir,
                    is_top_level: false,
                    subdir: dep_subdir,
                    git_ref: dep_git_ref
                };

                possiblyFetch(actions, platform, project_dir, dep_url, plugins_dir, opts, function(err) {
                    if (err) {
                        if (callback) callback(err);
                        else throw err;
                    } else end();
                });
            }
        });
    } else {
        handleInstall(actions, plugin_id, plugin_et, platform, project_dir, plugins_dir, plugin_basename, plugin_dir, filtered_variables, options.www_dir, options.is_top_level, callback);
    }
}

function handleInstall(actions, plugin_id, plugin_et, platform, project_dir, plugins_dir, plugin_basename, plugin_dir, filtered_variables, www_dir, is_top_level, callback) {
    require('../plugman').emit('log', 'Installing plugin ' + plugin_id + '...');
    var handler = platform_modules[platform];
    www_dir = www_dir || handler.www_dir(project_dir);

    var platformTag = plugin_et.find('./platform[@name="'+platform+'"]');
    var assets = plugin_et.findall('asset');
    if (platformTag) {
        var sourceFiles = platformTag.findall('./source-file'),
            headerFiles = platformTag.findall('./header-file'),
            resourceFiles = platformTag.findall('./resource-file'),
            libFiles = platformTag.findall('./lib-file');
        assets = assets.concat(platformTag.findall('./asset'));

        // queue up native stuff
        sourceFiles && sourceFiles.forEach(function(source) {
            actions.push(actions.createAction(handler["source-file"].install, [source, plugin_dir, project_dir, plugin_id], handler["source-file"].uninstall, [source, project_dir, plugin_id]));
        });

        headerFiles && headerFiles.forEach(function(header) {
            actions.push(actions.createAction(handler["header-file"].install, [header, plugin_dir, project_dir, plugin_id], handler["header-file"].uninstall, [header, project_dir, plugin_id]));
        });

        resourceFiles && resourceFiles.forEach(function(resource) {
            actions.push(actions.createAction(handler["resource-file"].install, [resource, plugin_dir, project_dir], handler["resource-file"].uninstall, [resource, project_dir]));
        });

        libFiles && libFiles.forEach(function(lib) {
            actions.push(actions.createAction(handler["lib-file"].install, [lib, plugin_dir, project_dir], handler["lib-file"].uninstall, [lib, project_dir]));
        });
    }

    // queue up asset installation
    var common = require('./platforms/common');
    assets && assets.forEach(function(asset) {
        actions.push(actions.createAction(common.asset.install, [asset, plugin_dir, www_dir], common.asset.uninstall, [asset, www_dir, plugin_id]));
    });

    // run through the action stack
    actions.process(platform, project_dir, function(err) {
        if (err) {
            if (callback) callback(err);
            else throw err;
        } else {

            // queue up the plugin so prepare knows what to do.
            config_changes.add_installed_plugin_to_prepare_queue(plugins_dir, plugin_basename, platform, filtered_variables, is_top_level);
            // call prepare after a successful install
            require('./../plugman').prepare(project_dir, platform, plugins_dir);

            require('../plugman').emit('results', plugin_id + ' installed.');
            // WIN!
            // Log out plugin INFO element contents in case additional install steps are necessary
            var info = plugin_et.findall('./info');
            if(info.length) {
                require('../plugman').emit('results', interp_vars(filtered_variables, info[0].text));
            }
            info = (platformTag ? platformTag.findall('./info') : []);
            if(info.length) {
                require('../plugman').emit('results', interp_vars(filtered_variables, info[0].text));
            }
            if (callback) callback();
        }
    });
}

function interp_vars(vars, text) {
    vars && Object.keys(vars).forEach(function(key) {
        var regExp = new RegExp("\\$" + key, "g");
        text = text.replace(regExp, vars[key]);
    });
    return text;
}
