var path = require('path'),
    fs   = require('fs'),
    fetch = require('./fetch'),
    et   = require('elementtree'),
    action_stack = require('./util/action-stack'),
    shell = require('shelljs'),
    child_process = require('child_process'),
    semver = require('semver'),
    config_changes = require('./util/config-changes'),
    xml_helpers = require('./util/xml-helpers'),
    Q = require('q'),
    platform_modules = require('./platforms'),
    os = require('os'),
    isWindows = (os.platform() === 'win32');

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
// Returns a promise.
module.exports = function installPlugin(platform, project_dir, id, plugins_dir, options) {
    if (!platform_modules[platform]) {
        return Q.reject(new Error(platform + " not supported."));
    }
    var current_stack = new action_stack();
    options.is_top_level = true;
    return possiblyFetch(current_stack, platform, project_dir, id, plugins_dir, options);
};

// possible options: subdir, cli_variables, www_dir, git_ref, is_top_level
// Returns a promise.
function possiblyFetch(actions, platform, project_dir, id, plugins_dir, options) {
    var plugin_dir = path.join(plugins_dir, id);

    // Check that the plugin has already been fetched.
    if (!fs.existsSync(plugin_dir)) {
        // if plugin doesnt exist, use fetch to get it.
        return require('../plugman').raw.fetch(id, plugins_dir, { link: false, subdir: options.subdir, git_ref: options.git_ref, client: 'plugman', expected_id: options.expected_id })
        .then(function(plugin_dir) {
            return runInstall(actions, platform, project_dir, plugin_dir, plugins_dir, options);
        });
    } else {
        return runInstall(actions, platform, project_dir, plugin_dir, plugins_dir, options);
    }
}

function checkEngines(engines) {
    for(var i = 0; i < engines.length; i++) {
        var engine = engines[i];
        if(semver.satisfies(engine.currentVersion, engine.minVersion) || engine.currentVersion == null){
            // engine ok!
        }else{
            return Q.reject(new Error('Plugin doesn\'t support this project\'s '+engine.name+' version. '+engine.name+': ' + engine.currentVersion + ', failed version requirement: ' + engine.minVersion));
        }
    }

    return Q(true);
}

function cleanVersionOutput(version, name){
    var out = version.trim();
    var rc_index = out.indexOf('rc');
    var dev_index = out.indexOf('dev');
    if (rc_index > -1) {
        out = out.substr(0, rc_index) + '-' + out.substr(rc_index);
    }  

    // strip out the -dev and put a warning about using the dev branch
    if (dev_index > -1) {
        // some platform still lists dev branches as just dev, set to null and continue
        if(out=="dev"){
            out = null;
        }else{
            out = out.substr(0, dev_index-1);
        }
        require('../plugman').emit('verbose', name+' has been detected as using a development branch. Attemping to install anyways.');
    }     
    
    // add extra period/digits to conform to semver - some version scripts will output
    // just a major or major minor version number
    var majorReg = /\d+/,
        minorReg = /\d+\.\d+/,
        patchReg = /\d+\.\d+\.\d+/;
    
    if(patchReg.test(out)){
        
    }else if(minorReg.test(out)){
        out = out.match(minorReg)[0]+'.0';
    }else if(majorReg.test(out)){
        out = out.match(majorReg)[0]+'.0.0';
    }    
    
    return out;
}

// exec engine scripts in order to get the current engine version
// Returns a promise for the array of engines.
function callEngineScripts(engines) {
    var engineScriptVersion;

    return Q.all(
        engines.map(function(engine){
            // CB-5192; on Windows scriptSrc doesn't have file extension so we shouldn't check whether the script exists
            if(isWindows || fs.existsSync(engine.scriptSrc)){
                
                if(!isWindows) { // not required on Windows
                    fs.chmodSync(engine.scriptSrc, '755');
                }
                var d = Q.defer();
                child_process.exec(engine.scriptSrc, function(error, stdout, stderr) {
                    if (error) {
                        require('../plugman').emit('log', 'Cordova project '+ engine.scriptSrc +' script failed, continuing anyways.');
                        engine.currentVersion = null;
                        d.resolve(engine); // Yes, resolve. We're trying to continue despite the error.
                    } else {
                        var version = cleanVersionOutput(stdout, engine.name);
                        engine.currentVersion = version;
                        d.resolve(engine);
                    }
                });
                return d.promise;
            }else if(engine.currentVersion){
                return cleanVersionOutput(engine.currentVersion, engine.name)
            }else{
                require('../plugman').emit('verbose', 'Cordova project '+ engine.scriptSrc +' not detected (lacks a '+ engine.scriptSrc +' script), continuing.');
                return null;
            }
        })
    );
}

// return only the engines we care about/need
function getEngines(pluginElement, platform, project_dir, plugin_dir){
    var engines = pluginElement.findall('engines/engine');
    var defaultEngines = require('./util/default-engines')(project_dir);
    var uncheckedEngines = [];
    var cordovaEngineIndex, cordovaPlatformEngineIndex, theName, platformIndex, defaultPlatformIndex;
    // load in known defaults and update when necessary
    engines.forEach(function(engine){   
        theName = engine.attrib["name"];
        
        // check to see if the engine is listed as a default engine
        if(defaultEngines[theName]){
            // make sure engine is for platform we are installing on
            defaultPlatformIndex = defaultEngines[theName].platform.indexOf(platform);
            if(defaultPlatformIndex > -1 || defaultEngines[theName].platform === '*'){
                defaultEngines[theName].minVersion = defaultEngines[theName].minVersion ? defaultEngines[theName].minVersion : engine.attrib["version"];
                defaultEngines[theName].currentVersion = defaultEngines[theName].currentVersion ? defaultEngines[theName].currentVersion : null;
                defaultEngines[theName].scriptSrc = defaultEngines[theName].scriptSrc ? defaultEngines[theName].scriptSrc : null;
                defaultEngines[theName].name = theName;
                
                // set the indices so we can pop the cordova engine when needed
                if(theName==='cordova') cordovaEngineIndex = uncheckedEngines.length;
                if(theName==='cordova-'+platform) cordovaPlatformEngineIndex = uncheckedEngines.length;
                
                uncheckedEngines.push(defaultEngines[theName]);
            }
        // check for other engines
        }else{
            platformIndex = engine.attrib["platform"].indexOf(platform);
            if(platformIndex > -1 || engine.attrib["platform"] === '*'){
                uncheckedEngines.push({ 'name': theName, 'platform': engine.attrib["platform"], 'scriptSrc':path.resolve(plugin_dir, engine.attrib["scriptSrc"]), 'minVersion' :  engine.attrib["version"]});
            }
        }
    });
    
    // make sure we check for platform req's and not just cordova reqs
    if(cordovaEngineIndex && cordovaPlatformEngineIndex) uncheckedEngines.pop(cordovaEngineIndex);
    return uncheckedEngines;
}


// possible options: cli_variables, www_dir, is_top_level
// Returns a promise.
var runInstall = module.exports.runInstall = function runInstall(actions, platform, project_dir, plugin_dir, plugins_dir, options) {
    var xml_path     = path.join(plugin_dir, 'plugin.xml')
      , plugin_et    = xml_helpers.parseElementtreeSync(xml_path)
      , filtered_variables = {};
    var name         = plugin_et.findall('name').text;
    var plugin_id    = plugin_et.getroot().attrib['id'];
    require('../plugman').emit('log', 'Starting installation of "' + plugin_id + '" for ' + platform);

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
        return Q();
    }

    var theEngines = getEngines(plugin_et, platform, project_dir, plugin_dir);
    return callEngineScripts(theEngines)
    .then(checkEngines)
    .then(function() {
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
            return Q.reject(new Error('Variable(s) missing: ' + missing_vars.join(", ")));
        }

        // Check for dependencies, (co)recurse to install each one
        var dependencies = plugin_et.findall('dependency') || [];
        dependencies = dependencies.concat(plugin_et.findall('./platform[@name="'+platform+'"]/dependency'));
        if (dependencies && dependencies.length) {
            require('../plugman').emit('verbose', 'Dependencies detected, iterating through them...');
            var dep_plugin_id, dep_subdir, dep_git_ref;
            return dependencies.reduce(function(soFar, dep) {
                return soFar.then(function() {
                    dep_plugin_id = dep.attrib.id;
                    dep_subdir = dep.attrib.subdir;
                    var dep_url = dep.attrib.url;
                    dep_git_ref = dep.attrib.commit;
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
                            return Q.reject(new Error('No fetch metadata found for ' + plugin_id + '. Cannot install relative dependencies.'));
                        }

                        // Now there are two cases here: local directory, and git URL.
                        if (fetchdata.source.type === 'local') {
                            dep_url = fetchdata.source.path;

                            var d = Q.defer();
                            child_process.exec('git rev-parse --show-toplevel', { cwd:dep_url }, function(err, stdout, stderr) {
                                if (err) {
                                    if (err.code == 128) {
                                        return d.reject(new Error('Plugin ' + plugin_id + ' is not in git repository. All plugins must be in a git repository.'));
                                    } else {
                                        return d.reject(new Error('Failed to locate git repository for ' + plugin_id + ' plugin.'));
                                    }
                                }

                                return d.resolve(stdout.trim());
                            });
                            return d.promise.then(function(git_repo) {
                                //Clear out the subdir since the url now contains it
                                var url = path.join(git_repo, dep_subdir);
                                dep_subdir = "";
                                return url;
                            });
                        } else if (fetchdata.source.type === 'git') {
                            return Q(fetchdata.source.url);
                        }
                    } else {
                        return Q(dep_url);
                    }
                })
                .then(function(dep_url) {
                    var dep_plugin_dir = path.join(plugins_dir, dep_plugin_id);
                    if (fs.existsSync(dep_plugin_dir)) {
                        require('../plugman').emit('verbose', 'Dependent plugin "' + dep_plugin_id + '" already fetched, using that version.');
                        var opts = {
                            cli_variables: filtered_variables,
                            www_dir: options.www_dir,
                            is_top_level: false
                        };
                        return runInstall(actions, platform, project_dir, dep_plugin_dir, plugins_dir, opts);
                    } else {
                        require('../plugman').emit('verbose', 'Dependent plugin "' + dep_plugin_id + '" not fetched, retrieving then installing.');
                        var opts = {
                            cli_variables: filtered_variables,
                            www_dir: options.www_dir,
                            is_top_level: false,
                            subdir: dep_subdir,
                            git_ref: dep_git_ref,
                            expected_id: dep_plugin_id
                        };

                        // CB-4770: registry fetching
                        if(dep_url === undefined) {
                            dep_url = dep_plugin_id;
                        }

                        return possiblyFetch(actions, platform, project_dir, dep_url, plugins_dir, opts);
                    }
                });
            }, Q())
            .then(function() {
                return handleInstall(actions, plugin_id, plugin_et, platform, project_dir, plugins_dir, plugin_basename, plugin_dir, filtered_variables, options.www_dir, options.is_top_level);
            });
        } else {
            return handleInstall(actions, plugin_id, plugin_et, platform, project_dir, plugins_dir, plugin_basename, plugin_dir, filtered_variables, options.www_dir, options.is_top_level);
        }
    });
}

function handleInstall(actions, plugin_id, plugin_et, platform, project_dir, plugins_dir, plugin_basename, plugin_dir, filtered_variables, www_dir, is_top_level) {
    require('../plugman').emit('verbose', 'Installing plugin ' + plugin_id);
    var handler = platform_modules[platform];
    www_dir = www_dir || handler.www_dir(project_dir);

    var platformTag = plugin_et.find('./platform[@name="'+platform+'"]');
    var assets = plugin_et.findall('asset');
    if (platformTag) {
        var sourceFiles = platformTag.findall('./source-file'),
            headerFiles = platformTag.findall('./header-file'),
            resourceFiles = platformTag.findall('./resource-file'),
            frameworkFiles = platformTag.findall('./framework[@custom="true"]'), // CB-5238 adding only custom frameworks
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
        // CB-5238 custom frameworks only 
        frameworkFiles && frameworkFiles.forEach(function(framework) {
            actions.push(actions.createAction(handler["framework"].install, [framework, plugin_dir, project_dir], handler["framework"].uninstall, [framework, project_dir]));
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
    return actions.process(platform, project_dir)
    .then(function(err) {
        // queue up the plugin so prepare knows what to do.
        config_changes.add_installed_plugin_to_prepare_queue(plugins_dir, plugin_basename, platform, filtered_variables, is_top_level);
        // call prepare after a successful install
        require('./../plugman').prepare(project_dir, platform, plugins_dir, www_dir);

        require('../plugman').emit('log', plugin_id + ' installed on ' + platform + '.');
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
    });
}

function interp_vars(vars, text) {
    vars && Object.keys(vars).forEach(function(key) {
        var regExp = new RegExp("\\$" + key, "g");
        text = text.replace(regExp, vars[key]);
    });
    return text;
}
