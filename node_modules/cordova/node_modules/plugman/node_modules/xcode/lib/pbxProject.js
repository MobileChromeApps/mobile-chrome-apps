var util = require('util'),
    f = util.format,
    EventEmitter = require('events').EventEmitter,
    path = require('path'),
    uuid = require('node-uuid'),
    fork = require('child_process').fork,
    pbxWriter = require('./pbxWriter'),
    pbxFile = require('./pbxFile'),
    fs = require('fs'),
    parser = require('./parser/pbxproj'),
    COMMENT_KEY = /_comment$/

function pbxProject(filename) {
    if (!(this instanceof pbxProject))
        return new pbxProject(filename);

    this.filepath = path.resolve(filename)
}

util.inherits(pbxProject, EventEmitter)

pbxProject.prototype.parse = function (cb) {
    var worker = fork(__dirname + '/parseJob.js', [this.filepath])

    worker.on('message', function (msg) {
        if (msg.name == 'SyntaxError' || msg.code) {
            this.emit('error', msg);
        } else {
            this.hash = msg;
            this.emit('end', null, msg)
        }
    }.bind(this));

    if (cb) {
        this.on('error', cb);
        this.on('end', cb);
    }

    return this;
}

pbxProject.prototype.parseSync = function () {
    var file_contents = fs.readFileSync(this.filepath, 'utf-8');

    this.hash = parser.parse(file_contents);
    return this;
}

pbxProject.prototype.writeSync = function () {
    this.writer = new pbxWriter(this.hash);
    return this.writer.writeSync();
}

pbxProject.prototype.allUuids = function () {
    var sections = this.hash.project.objects,
        uuids = [],
        section;

    for (key in sections) {
        section = sections[key]
        uuids = uuids.concat(Object.keys(section))
    }

    uuids = uuids.filter(function (str) {
        return !COMMENT_KEY.test(str) && str.length == 24;
    });

    return uuids;
}

pbxProject.prototype.generateUuid = function () {
    var id = uuid.v4()
                .replace(/-/g,'')
                .substr(0,24)
                .toUpperCase()

    if (this.allUuids().indexOf(id) >= 0) {
        return this.generateUuid();
    } else {
        return id;
    }
}

pbxProject.prototype.addPluginFile = function (path, opt) {
    var file = new pbxFile(path, opt);

    file.plugin = true; // durr
    correctForPluginsPath(file, this);

    // null is better for early errors
    if (this.hasFile(file.path)) return null;

    file.fileRef = this.generateUuid();

    this.addToPbxFileReferenceSection(file);    // PBXFileReference
    this.addToPluginsPbxGroup(file);            // PBXGroup

    return file;
}

pbxProject.prototype.removePluginFile = function (path, opt) {
    var file = new pbxFile(path, opt);
    correctForPluginsPath(file, this);

    this.removeFromPbxFileReferenceSection(file);    // PBXFileReference
    this.removeFromPluginsPbxGroup(file);            // PBXGroup

    return file;
}

pbxProject.prototype.addSourceFile = function (path, opt) {
    var file = this.addPluginFile(path, opt);

    if (!file) return false;

    file.uuid = this.generateUuid();

    this.addToPbxBuildFileSection(file);        // PBXBuildFile
    this.addToPbxSourcesBuildPhase(file);       // PBXSourcesBuildPhase

    return file;
}

pbxProject.prototype.removeSourceFile = function (path, opt) {
    var file = this.removePluginFile(path, opt)
    this.removeFromPbxBuildFileSection(file);        // PBXBuildFile
    this.removeFromPbxSourcesBuildPhase(file);       // PBXSourcesBuildPhase

    return file;
}

pbxProject.prototype.addHeaderFile = function (path, opt) {
    return this.addPluginFile(path, opt)
}

pbxProject.prototype.removeHeaderFile = function (path, opt) {
    return this.removePluginFile(path, opt)
}

pbxProject.prototype.addResourceFile = function (path, opt) {
    opt = opt || {};

    var file;

    if (opt.plugin) {
        file = this.addPluginFile(path, opt);
        if (!file) return false;
    } else {
        file = new pbxFile(path, opt);
        if (this.hasFile(file.path)) return false;
    }

    file.uuid = this.generateUuid();

    if (!opt.plugin) {
        correctForResourcesPath(file, this);
        file.fileRef = this.generateUuid();
    }

    this.addToPbxBuildFileSection(file);        // PBXBuildFile
    this.addToPbxResourcesBuildPhase(file);     // PBXResourcesBuildPhase

    if (!opt.plugin) {
        this.addToPbxFileReferenceSection(file);    // PBXFileReference
        this.addToResourcesPbxGroup(file);          // PBXGroup
    }

    return file;
}

pbxProject.prototype.removeResourceFile = function (path, opt) {
    var file = new pbxFile(path, opt);
    
    correctForResourcesPath(file, this);

    this.removeFromPbxBuildFileSection(file);        // PBXBuildFile
    this.removeFromPbxFileReferenceSection(file);    // PBXFileReference
    this.removeFromResourcesPbxGroup(file);          // PBXGroup
    this.removeFromPbxResourcesBuildPhase(file);     // PBXResourcesBuildPhase
    
    return file;
}

pbxProject.prototype.addFramework = function (path, opt) {
    var file = new pbxFile(path, opt);

    // catch duplicates
    if (this.hasFile(file.path)) return false;

    file.uuid = this.generateUuid();
    file.fileRef = this.generateUuid();

    this.addToPbxBuildFileSection(file);        // PBXBuildFile
    this.addToPbxFileReferenceSection(file);    // PBXFileReference
    this.addToFrameworksPbxGroup(file);         // PBXGroup
    this.addToPbxFrameworksBuildPhase(file);    // PBXFrameworksBuildPhase

    return file;
}

pbxProject.prototype.removeFramework = function (path, opt) {
    var file = new pbxFile(path, opt);

    this.removeFromPbxBuildFileSection(file);        // PBXBuildFile
    this.removeFromPbxFileReferenceSection(file);    // PBXFileReference
    this.removeFromFrameworksPbxGroup(file);         // PBXGroup
    this.removeFromPbxFrameworksBuildPhase(file);    // PBXFrameworksBuildPhase

    return file;
}

pbxProject.prototype.addStaticLibrary = function (path, opt) {
    opt = opt || {};

    var file;

    if (opt.plugin) {
        file = this.addPluginFile(path, opt);
        if (!file) return false;
    } else {
        file = new pbxFile(path, opt);
        if (this.hasFile(file.path)) return false;
    }

    file.uuid = this.generateUuid();

    if (!opt.plugin) {
        file.fileRef = this.generateUuid();
        this.addToPbxFileReferenceSection(file);    // PBXFileReference
    }

    this.addToPbxBuildFileSection(file);        // PBXBuildFile
    this.addToPbxFrameworksBuildPhase(file);    // PBXFrameworksBuildPhase
    this.addToLibrarySearchPaths(file);        // make sure it gets built!

    return file;
}

// helper addition functions
pbxProject.prototype.addToPbxBuildFileSection = function (file) {
    var commentKey = f("%s_comment", file.uuid);

    this.pbxBuildFileSection()[file.uuid] = pbxBuildFileObj(file);
    this.pbxBuildFileSection()[commentKey] = pbxBuildFileComment(file);
}

pbxProject.prototype.removeFromPbxBuildFileSection = function (file) {
    var uuid;

    for(uuid in this.pbxBuildFileSection()) {
        if(this.pbxBuildFileSection()[uuid].fileRef_comment == file.basename) {
            file.uuid = uuid;
            delete this.pbxBuildFileSection()[uuid];
        }
    }
    var commentKey = f("%s_comment", file.uuid);
    delete this.pbxBuildFileSection()[commentKey];
}

pbxProject.prototype.addToPbxFileReferenceSection = function (file) {
    var commentKey = f("%s_comment", file.fileRef);

    this.pbxFileReferenceSection()[file.fileRef] = pbxFileReferenceObj(file);
    this.pbxFileReferenceSection()[commentKey] = pbxFileReferenceComment(file);
}

pbxProject.prototype.removeFromPbxFileReferenceSection = function (file) {

    var i;
    var refObj = pbxFileReferenceObj(file);
    for(i in this.pbxFileReferenceSection()) {
        if(this.pbxFileReferenceSection()[i].name == refObj.name ||
           this.pbxFileReferenceSection()[i].path == refObj.path) {
            file.fileRef = file.uuid = i;
            delete this.pbxFileReferenceSection()[i];
            break;
        }
    }
    var commentKey = f("%s_comment", file.fileRef);
    if(this.pbxFileReferenceSection()[commentKey] != undefined) {
        delete this.pbxFileReferenceSection()[commentKey];
    }

    return file;
}

pbxProject.prototype.addToPluginsPbxGroup = function (file) {
    var pluginsGroup = this.pbxGroupByName('Plugins');
    pluginsGroup.children.push(pbxGroupChild(file));
}

pbxProject.prototype.removeFromPluginsPbxGroup = function (file) {
    var pluginsGroupChildren = this.pbxGroupByName('Plugins').children, i;
    for(i in pluginsGroupChildren) {
        if(pbxGroupChild(file).value == pluginsGroupChildren[i].value &&
           pbxGroupChild(file).comment == pluginsGroupChildren[i].comment) {
            pluginsGroupChildren.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToResourcesPbxGroup = function (file) {
    var pluginsGroup = this.pbxGroupByName('Resources');
    pluginsGroup.children.push(pbxGroupChild(file));
}

pbxProject.prototype.removeFromResourcesPbxGroup = function (file) {
    var pluginsGroupChildren = this.pbxGroupByName('Resources').children, i;
    for(i in pluginsGroupChildren) {
        if(pbxGroupChild(file).value == pluginsGroupChildren[i].value &&
           pbxGroupChild(file).comment == pluginsGroupChildren[i].comment) {
            pluginsGroupChildren.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToFrameworksPbxGroup = function (file) {
    var pluginsGroup = this.pbxGroupByName('Frameworks');
    pluginsGroup.children.push(pbxGroupChild(file));
}

pbxProject.prototype.removeFromFrameworksPbxGroup = function (file) {
    var pluginsGroupChildren = this.pbxGroupByName('Frameworks').children;
    
    for(i in pluginsGroupChildren) {
        if(pbxGroupChild(file).value == pluginsGroupChildren[i].value &&
           pbxGroupChild(file).comment == pluginsGroupChildren[i].comment) {
            pluginsGroupChildren.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToPbxSourcesBuildPhase = function (file) {
    var sources = this.pbxSourcesBuildPhaseObj();
    sources.files.push(pbxBuildPhaseObj(file));
}

pbxProject.prototype.removeFromPbxSourcesBuildPhase = function (file) {
    var sources = this.pbxSourcesBuildPhaseObj(), i;
    for(i in sources.files) {
        if(sources.files[i].comment == longComment(file)) {
            sources.files.splice(i, 1);
            break; 
        }
    }
}

pbxProject.prototype.addToPbxResourcesBuildPhase = function (file) {
    var sources = this.pbxResourcesBuildPhaseObj();
    sources.files.push(pbxBuildPhaseObj(file));
}

pbxProject.prototype.removeFromPbxResourcesBuildPhase = function (file) {
    var sources = this.pbxResourcesBuildPhaseObj(), i;

    for(i in sources.files) {
        if(sources.files[i].comment == longComment(file)) {
            sources.files.splice(i, 1);
            break;
        }
    }
}

pbxProject.prototype.addToPbxFrameworksBuildPhase = function (file) {
    var sources = this.pbxFrameworksBuildPhaseObj();
    sources.files.push(pbxBuildPhaseObj(file));
}

pbxProject.prototype.removeFromPbxFrameworksBuildPhase = function (file) {
    var sources = this.pbxFrameworksBuildPhaseObj();
    for(i in sources.files) {
        if(sources.files[i].comment == longComment(file)) {
            sources.files.splice(i, 1);
            break;
        }
    }
}

// helper access functions
pbxProject.prototype.pbxBuildFileSection = function () {
    return this.hash.project.objects['PBXBuildFile'];
}

pbxProject.prototype.pbxXCBuildConfigurationSection = function () {
    return this.hash.project.objects['XCBuildConfiguration'];
}

pbxProject.prototype.pbxFileReferenceSection = function () {
    return this.hash.project.objects['PBXFileReference'];
}

pbxProject.prototype.pbxGroupByName = function (name) {
    var groups = this.hash.project.objects['PBXGroup'],
        key, groupKey;

    for (key in groups) {
        // only look for comments
        if (!COMMENT_KEY.test(key)) continue;

        if (groups[key] == name) {
            groupKey = key.split(COMMENT_KEY)[0];
            return groups[groupKey];
        }
    }

    return null;
}

pbxProject.prototype.pbxSourcesBuildPhaseObj = function () {
    return this.buildPhaseObject('PBXSourcesBuildPhase', 'Sources');
}

pbxProject.prototype.pbxResourcesBuildPhaseObj = function () {
    return this.buildPhaseObject('PBXResourcesBuildPhase', 'Resources');
}

pbxProject.prototype.pbxFrameworksBuildPhaseObj = function () {
    return this.buildPhaseObject('PBXFrameworksBuildPhase', 'Frameworks');
}

pbxProject.prototype.buildPhaseObject = function (name, group) {
    var section = this.hash.project.objects[name],
        obj, sectionKey, key;

    for (key in section) {
        // only look for comments
        if (!COMMENT_KEY.test(key)) continue;

        if (section[key] == group) {
            sectionKey = key.split(COMMENT_KEY)[0];
            return section[sectionKey];
        }
    }

    return null;
}

pbxProject.prototype.updateProductName = function(name) {
    var config = this.pbxXCBuildConfigurationSection();
    propReplace(config, 'PRODUCT_NAME', '"' + name + '"');
}

pbxProject.prototype.removeFromLibrarySearchPaths = function (file) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        SEARCH_PATHS = 'LIBRARY_SEARCH_PATHS',
        config, buildSettings, searchPaths;
    var new_path = searchPathForFile(file, this);

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        if (buildSettings[SEARCH_PATHS]) {
            var matches = buildSettings[SEARCH_PATHS].filter(function(p) {
                return p.indexOf(new_path) > -1;
            });
            matches.forEach(function(m) {
                var idx = buildSettings[SEARCH_PATHS].indexOf(m);
                buildSettings[SEARCH_PATHS].splice(idx, 1);
            });
        }

    }
}

pbxProject.prototype.addToLibrarySearchPaths = function (file) {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        INHERITED = '"$(inherited)"',
        config, buildSettings, searchPaths;

    for (config in configurations) {
        buildSettings = configurations[config].buildSettings;

        if (unquote(buildSettings['PRODUCT_NAME']) != this.productName)
            continue;

        if (!buildSettings['LIBRARY_SEARCH_PATHS']) {
            buildSettings['LIBRARY_SEARCH_PATHS'] = [INHERITED];
        }

        buildSettings['LIBRARY_SEARCH_PATHS'].push(searchPathForFile(file, this));
    }
}

// a JS getter. hmmm
pbxProject.prototype.__defineGetter__("productName", function () {
    var configurations = nonComments(this.pbxXCBuildConfigurationSection()),
        config, productName;

    for (config in configurations) {
        productName = configurations[config].buildSettings['PRODUCT_NAME'];

        if (productName) {
            return unquote(productName);
        }
    }
});

// check if file is present
pbxProject.prototype.hasFile = function (filePath) {
    var files = nonComments(this.pbxFileReferenceSection()),
        file, id;

    for (id in files) {
        file = files[id];

        if (file.path == filePath || file.path == ('"' + filePath + '"')) {
            return true;
        }
    }

    return false;
}

// helper recursive prop search+replace
function propReplace(obj, prop, value) {
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            if (typeof obj[p] == 'object') {
                propReplace(obj[p], prop, value);
            } else if (p == prop) {
                obj[p] = value;
            }
        }
    }
}

// helper object creation functions
function pbxBuildFileObj(file) {
    var obj = Object.create(null);

    obj.isa = 'PBXBuildFile';
    obj.fileRef = file.fileRef;
    obj.fileRef_comment = file.basename;
    if (file.settings) obj.settings = file.settings;

    return obj;
}

function pbxFileReferenceObj(file) {
    var obj = Object.create(null);

    obj.isa = 'PBXFileReference';
    obj.lastKnownFileType = file.lastType;
    
    obj.name = "\"" + file.basename + "\"";
    obj.path = "\"" + file.path + "\"";
    
    obj.sourceTree = file.sourceTree;

    if (file.fileEncoding)
        obj.fileEncoding = file.fileEncoding;

    return obj;
}

function pbxGroupChild(file) {
    var obj = Object.create(null);

    obj.value = file.fileRef;
    obj.comment = file.basename;

    return obj;
}

function pbxBuildPhaseObj(file) {
    var obj = Object.create(null);

    obj.value = file.uuid;
    obj.comment = longComment(file);

    return obj;
}

function pbxBuildFileComment(file) {
    return longComment(file);
}

function pbxFileReferenceComment(file) {
    return file.basename;
}

function longComment(file) {
    return f("%s in %s", file.basename, file.group);
}

// respect <group> path
function correctForPluginsPath(file, project) {
    var r_plugin_dir = /^Plugins\//;

    if (project.pbxGroupByName('Plugins').path)
        file.path = file.path.replace(r_plugin_dir, '');

    return file;
}

function correctForResourcesPath(file, project) {
    var r_resources_dir = /^Resources\//;

    if (project.pbxGroupByName('Resources').path)
        file.path = file.path.replace(r_resources_dir, '');

    return file;
}

function searchPathForFile(file, proj) {
    var pluginsPath = proj.pbxGroupByName('Plugins').path,
        fileDir = path.dirname(file.path);

    if (fileDir == '.') {
        fileDir = '';
    } else {
        fileDir = '/' + fileDir;
    }

    if (file.plugin && pluginsPath) {
        return '"\\"$(SRCROOT)/' + unquote(pluginsPath) + '\\""';
    } else {
        return '"\\"$(SRCROOT)/' + proj.productName + fileDir + '\\""';
    }
}

function nonComments(obj) {
    var keys = Object.keys(obj),
        newObj = {}, i = 0;

    for (i; i < keys.length; i++) {
        if (!COMMENT_KEY.test(keys[i])) {
            newObj[keys[i]] = obj[keys[i]];
        }
    }

    return newObj;
}

function unquote(str) {
    if (str) return str.replace(/^"(.*)"$/, "$1");
}

module.exports = pbxProject;
