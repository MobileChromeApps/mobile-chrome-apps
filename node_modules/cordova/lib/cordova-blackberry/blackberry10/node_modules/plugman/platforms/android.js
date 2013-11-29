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

var fs = require('fs')  // use existsSync in 0.6.x
   , path = require('path')
   , util = require('util')
   , shell = require('shelljs')
   , et = require('elementtree')
   , getConfigChanges = require('../util/config-changes')

   , assetsDir = 'assets/www'  // relative path to project's web assets
   , sourceDir = 'src'
   , xml_helpers = require(path.join(__dirname, '..', 'util', 'xml-helpers'));


exports.handlePlugin = function (action, project_dir, plugin_dir, plugin_et) {
    var plugin_id = plugin_et._root.attrib['id']
      , version = plugin_et._root.attrib['version']
      , external_hosts = []
      , i = 0
      // look for assets in the plugin 
      , assets = plugin_et.findall('./asset')
      , platformTag = plugin_et.find('./platform[@name="android"]')
      , sourceFiles = platformTag.findall('./source-file')
      , libFiles = platformTag.findall('./library-file')
      , PACKAGE_NAME = androidPackageName(project_dir)
      , configChanges = getConfigChanges(platformTag);

	// get config.xml filename
	var config_xml_filename = 'res/xml/config.xml';
    if(fs.existsSync(path.resolve(project_dir, 'res/xml/plugins.xml'))) {
        config_xml_filename = 'res/xml/plugins.xml';
    }

    // collision detection 
    if(action == "install" && pluginInstalled(plugin_et, project_dir, config_xml_filename)) {
        throw "Plugin "+plugin_id+" already installed"
    } else if(action == "uninstall" && !pluginInstalled(plugin_et, project_dir, config_xml_filename)) {
        throw "Plugin "+plugin_id+" not installed"
    }

	root = et.Element("config-file");
	root.attrib['parent'] = '.'
    plugin_et.findall('./access').forEach(function (tag) { 
		root.append(tag);
	});

	if (root.len()) {
		(configChanges[config_xml_filename]) ?
        	configChanges[config_xml_filename].push(root) :
        	configChanges[config_xml_filename] = [root];
	}

	// find which config-files we're interested in
    Object.keys(configChanges).forEach(function (configFile) {
        if (!fs.existsSync(path.resolve(project_dir, configFile))) {
            delete configChanges[configFile];
        }
    });

    // move asset files
    assets.forEach(function (asset) {
        var srcPath = path.resolve(
                        plugin_dir,
                        asset.attrib['src']);

        var targetPath = path.resolve(
                            project_dir,
                            assetsDir,
                            asset.attrib['target']);

        var stats = fs.statSync(srcPath);
        if (action == 'install') {
            if(stats.isDirectory()) {
                shell.mkdir('-p', targetPath);
                shell.cp('-R', srcPath, path.join(project_dir, assetsDir));
            } else {
                shell.cp(srcPath, targetPath);
            }
        } else {
            shell.rm('-rf', targetPath);
        }
    });

    // move source files
    sourceFiles.forEach(function (sourceFile) {
        var srcDir = path.resolve(project_dir,
                                sourceFile.attrib['target-dir'])
          , destFile = path.resolve(srcDir,
                                path.basename(sourceFile.attrib['src']));

        if (action == 'install') {
            shell.mkdir('-p', srcDir);
            var srcFile = srcPath(plugin_dir, sourceFile.attrib['src']);
            shell.cp(srcFile, destFile);
        } else {
            fs.unlinkSync(destFile);
            // check if directory is empty
            var curDir = srcDir;
            while(curDir !== project_dir + '/src') {
                if(fs.readdirSync(curDir).length == 0) {
                    fs.rmdirSync(curDir);
                    curDir = path.resolve(curDir + '/..');
                } else {
                    // directory not empty...do nothing
                    break;
                }
            }
        }
    })

    // move library files
    libFiles.forEach(function (libFile) {
        var libDir = path.resolve(project_dir,
                                libFile.attrib['target-dir'])

        if (action == 'install') {
            shell.mkdir('-p', libDir);
            var src = path.resolve(plugin_dir, 'src/android',
                                        libFile.attrib['src']),
                dest = path.resolve(libDir,
                                path.basename(libFile.attrib['src']));
            
            shell.cp(src, dest);
        } else {
            var destFile = path.resolve(libDir,
                            path.basename(libFile.attrib['src']));

            fs.unlinkSync(destFile);
            // check if directory is empty
            var files = fs.readdirSync(libDir);
            if(files.length == 0) {
                shell.rm('-rf', libDir);
            }
        }
    })

    // edit configuration files
    Object.keys(configChanges).forEach(function (filename) {
        var filepath = path.resolve(project_dir, filename),
            xmlDoc = xml_helpers.parseElementtreeSync(filepath),
            output;

        configChanges[filename].forEach(function (configNode) {
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

        output = xmlDoc.write({indent: 4});
        output = output.replace(/\$PACKAGE_NAME/g, PACKAGE_NAME);
        fs.writeFileSync(filepath, output);
    });
}


function srcPath(pluginPath, filename) {
    var prefix = /^src\/android/;

    if (prefix.test(filename)) {
        return path.resolve(pluginPath, filename);
    } else {
        return path.resolve(pluginPath, 'src/android', filename);
    }
}

// reads the package name out of the Android Manifest file
// @param string project_dir the absolute path to the directory containing the project
// @return string the name of the package
function androidPackageName(project_dir) {
    var mDoc = xml_helpers.parseElementtreeSync(
            path.resolve(project_dir, 'AndroidManifest.xml'));

    return mDoc._root.attrib['package'];
}

function pluginInstalled(plugin_et, project_dir, config_xml_filename) {
    var tag_xpath = util.format('./platform[@name="android"]/config-file[@target="%s"]/plugin', config_xml_filename);
    var plugin_name = plugin_et.find(tag_xpath).attrib.name;
    return (fs.readFileSync(path.resolve(project_dir, config_xml_filename), 'utf8')
           .match(new RegExp(plugin_name, "g")) != null);
}
