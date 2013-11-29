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

var path = require('path')
  , fs = require('../util/fs')  // use existsSync in 0.6.x
  , glob = require('glob')
  , et = require('elementtree')
  , xcode = require('xcode')
  , plist = require('plist')
  , bplist = require('bplist-parser')
  , shell = require('shelljs')
  , xml_helpers = require(path.join(__dirname, '..', 'util', 'xml-helpers'))
  , getConfigChanges = require(path.join(__dirname, '..', 'util', 'config-changes'))
  , assetsDir = 'www';    // relative path to project's web assets

exports.handlePlugin = function (action, project_dir, plugin_dir, plugin_et) {
    var plugin_id = plugin_et._root.attrib['id']
      , version = plugin_et._root.attrib['version']
      , i = 0
      , matched;
    // grab and parse pbxproj
    // we don't want CordovaLib's xcode project
    var project_files = glob.sync(project_dir + '/*.xcodeproj/project.pbxproj');
    
    if (!project_files.length) throw "does not appear to be an xcode project";
    var pbxPath = project_files[0];

    var xcodeproj = xcode.project(project_files[0]);
    xcodeproj.parseSync();

    // grab and parse plist file or config.xml
    var config_files = (glob.sync(project_dir + '/**/{PhoneGap,Cordova}.plist').length == 0 ? 
                        glob.sync(project_dir + '/**/config.xml') :
                        glob.sync(project_dir + '/**/{PhoneGap,Cordova}.plist')
                       );

    if (!config_files.length) {
        throw "does not appear to be a PhoneGap project";
    }

    config_files = config_files.filter(function (val) {
        return !(/^build\//.test(val));
    });

    var pluginsDir = path.resolve(config_files[0], '..', 'Plugins');
    var resourcesDir = path.resolve(config_files[0], '..', 'Resources');

    // collision detection 
    if(action == "install" && pluginInstalled(plugin_et, config_files[0])) {
        throw "Plugin "+plugin_id+" already installed"
    } else if(action == "uninstall" && !pluginInstalled(plugin_et, config_files[0])) {
        throw "Plugin "+plugin_id+" not installed"
    }
    var assets = plugin_et.findall('./asset'),
        platformTag = plugin_et.find('./platform[@name="ios"]'),
        sourceFiles = platformTag.findall('./source-file'),
        headerFiles = platformTag.findall('./header-file'),
        resourceFiles = platformTag.findall('./resource-file'),
        frameworks = platformTag.findall('./framework');

    // move asset files into www
    assets.forEach(function (asset) {
        var srcPath = path.resolve(
                        plugin_dir, asset.attrib['src']);

        var targetPath = path.resolve(
                            project_dir,
                            assetsDir, asset.attrib['target']);
        var stat = fs.statSync(srcPath);
        if(stat.isDirectory()) {
            shell.mkdir('-p', targetPath);
        }
        if (action == 'install') {
            shell.cp('-r', srcPath, targetPath);
        } else {
            shell.rm('-rf', targetPath);
        }
    });

    // move native files (source/header/resource)
    sourceFiles.forEach(function (sourceFile) {
        var src = sourceFile.attrib['src'],
            srcFile = path.resolve(plugin_dir, 'src/ios', src),
            targetDir = path.resolve(pluginsDir, getRelativeDir(sourceFile)),
            destFile = path.resolve(targetDir, path.basename(src));
         
        if (action == 'install') {
            xcodeproj.addSourceFile('Plugins/' + path.relative(pluginsDir, destFile));
            shell.mkdir('-p', targetDir);
            shell.cp(srcFile, destFile);
        } else {
            xcodeproj.removeSourceFile('Plugins/' + path.basename(src));   
            if(fs.existsSync(destFile))
                fs.unlinkSync(destFile);
            shell.rm('-rf', targetDir);    
        }
    });

    headerFiles.forEach(function (headerFile) {
        var src = headerFile.attrib['src'],
            srcFile = path.resolve(plugin_dir, 'src/ios', src),
            targetDir = path.resolve(pluginsDir, getRelativeDir(headerFile)),
            destFile = path.resolve(targetDir, path.basename(src));
         
        if (action == 'install') {     
            xcodeproj.addHeaderFile('Plugins/' + path.relative(pluginsDir, destFile));
            shell.mkdir('-p', targetDir);
            shell.cp(srcFile, destFile);
        } else {
            xcodeproj.removeHeaderFile('Plugins/' + path.basename(src));
            if(fs.existsSync(destFile))
                fs.unlinkSync(destFile);
            shell.rm('-rf', targetDir);
        }
    });

    resourceFiles.forEach(function (resource) {
        var src = resource.attrib['src'],
            srcFile = path.resolve(plugin_dir, 'src/ios', src),
            destFile = path.resolve(resourcesDir, path.basename(src));

        if (action == 'install') {
            xcodeproj.addResourceFile('Resources/' + path.basename(src));
            var st = fs.statSync(srcFile);
            if (st.isDirectory()) {
                shell.cp('-R', srcFile, resourcesDir);
            } else {
                shell.cp(srcFile, destFile);
            }
        } else {
            xcodeproj.removeResourceFile('Resources/' + path.basename(src));
            shell.rm('-rf', destFile);
        }
    });

    frameworks.forEach(function (framework) {
        var src = framework.attrib['src'],
            weak = framework.attrib['weak'];

        if (action == 'install') {
			var opt = { weak: (weak && weak.toLowerCase() == 'true') };
            xcodeproj.addFramework(src, opt);
        } else {
            xcodeproj.removeFramework(src);
        }
    });

    updateConfig(action, config_files[0], plugin_et);

    // write out xcodeproj file
    fs.writeFileSync(pbxPath, xcodeproj.writeSync());
}

function getRelativeDir(file) {
    var targetDir = file.attrib['target-dir'],
        preserveDirs = file.attrib['preserve-dirs'];

    if (preserveDirs && preserveDirs.toLowerCase() == 'true') {
        return path.dirname(file.attrib['src']);
    } else if (targetDir) {
        return targetDir;
    } else {
        return '';
    }
}

// determine if a plist file is binary
function isBinaryPlist(filename) {
    // I wish there was a synchronous way to read only the first 6 bytes of a
    // file. This is wasteful :/ 
    var buf = '' + fs.readFileSync(filename, 'utf8');
    // binary plists start with a magic header, "bplist"
    return buf.substring(0, 6) === 'bplist';
}

function updatePlistFile(action, config_path, plugin_et) {
    var hosts = plugin_et.findall('./access'),
        platformTag = plugin_et.find('./platform[@name="ios"]'), // FIXME: can probably do better than this
        plistEle = platformTag.find('./plugins-plist'),
        external_hosts = [];

    // determine if this is a binary or ascii plist and choose the parser
    // this is temporary until binary support is added to node-plist
    var pl = (isBinaryPlist(config_path) ? bplist : plist);

    var plistObj = pl.parseFileSync(config_path);
    
    if (action == 'install') {
        // add hosts to whitelist (ExternalHosts) in plist
        hosts.forEach(function(host) {
            plistObj.ExternalHosts.push(host.attrib['origin']);
        });

        // add plugin to plist
        plistObj.Plugins[plistEle.attrib['key']] = plistEle.attrib['string'];
    } else {
        // remove hosts from whitelist (ExternalHosts) in plist
        // check each entry in external hosts, only add it to the plist if
        // it's not an entry added by this plugin 
        for(i=0; i < plistObj.ExternalHosts.length;i++) {
            matched = false;
            hosts.forEach(function(host) {
                if(host === plistObj.ExternalHosts[i]) {
                    matched = true;
                }
            });
            if (!matched) {
                external_hosts.push(plistObj.ExternalHosts[i]);
            }
        }

        // filtered the external hosts entries out, copy result
        plistObj.ExternalHosts = external_hosts;

        delete plistObj.Plugins[plistEle.attrib['key']];
    }
    
    // write out plist
    fs.writeFileSync(config_path, plist.build(plistObj));
}

function pluginInstalled(plugin_et, config_path) {
    var config_tag = plugin_et.find('./platform[@name="ios"]/config-file[@target="config.xml"]/plugin') ||
                     plugin_et.find('./platform[@name="ios"]/plugins-plist');
    var plugin_name = config_tag.attrib.name || config_tag.attrib.key;
    return (fs.readFileSync(config_path, 'utf8').match(new RegExp(plugin_name, "g")) != null);
}

function updateConfigXml(action, config_path, plugin_et) {
    var hosts = plugin_et.findall('./access'),
        platformTag = plugin_et.find('./platform[@name="ios"]'), // FIXME: can probably do better than this
        plistEle = platformTag.find('./plugins-plist'), // use this for older that have plugins-plist
		configChanges = getConfigChanges(platformTag),
	    base_config_path = path.basename(config_path);

    // edit configuration files
    var xmlDoc = xml_helpers.parseElementtreeSync(config_path),
        output,
		pListOnly = plistEle;

	if (configChanges[path.basename(config_path)]) {	
		configChanges[path.basename(config_path)].forEach(function (val) {
			if (val.find("plugin")) pListOnly = false;
		});
	}

    if (pListOnly) {
        // if the plugin supports the old plugins-plist element only
        var name = plistEle.attrib.key;
        var value = plistEle.attrib.string;
        var pluginsEl = xmlDoc.find('plugins');
        if ( action == 'install') {
            var new_plugin = new et.Element('plugin');
            new_plugin.attrib.name = name;
            new_plugin.attrib.value = value;
            pluginsEl.append(new_plugin);
        } else {
            var culprit = pluginsEl.find("plugin[@name='"+name+"']");
            pluginsEl.remove(0, culprit);
        }

    }

	// add whitelist hosts
	root = et.Element("config-file");
	root.attrib['parent'] = '.'
    hosts.forEach(function (tag) {
		root.append(tag);
	});

	if (root.len()) {
		(configChanges[path.basename(config_path)]) ?
        	configChanges[path.basename(config_path)].push(root) :
        	configChanges[path.basename(config_path)] = [root];
	}

	if (configChanges[path.basename(config_path)]) {

	    configChanges[base_config_path].forEach(function (configNode) {
	        var selector = configNode.attrib["parent"],
	            children = configNode.findall('*');
	        if( action == 'install') {
	            if (!xml_helpers.graftXML(xmlDoc, children, selector)) {
	                throw new Error('failed to add children to ' + filename);
	            }
	        } else {
	            if (!xml_helpers.pruneXML(xmlDoc, children, selector)) {
	                throw new Error('failed to remove children from' + filename);
	            }
	        }
		});
	}

    output = xmlDoc.write({indent: 4});
    fs.writeFileSync(config_path, output);
}

// updates plist file and/or config.xml
function updateConfig(action, config_path, plugin_et) {
    if(path.basename(config_path) == "config.xml") {
        updateConfigXml(action, config_path, plugin_et);
    } else {
        updatePlistFile(action, config_path, plugin_et);
    }
}
