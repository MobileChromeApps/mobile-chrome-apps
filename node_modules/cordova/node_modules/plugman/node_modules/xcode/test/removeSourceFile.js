var fullProject = require('./fixtures/full-project')
    fullProjectStr = JSON.stringify(fullProject),
    pbx = require('../lib/pbxProject'),
    pbxFile = require('../lib/pbxFile'),
    proj = new pbx('.');

function cleanHash() {
    return JSON.parse(fullProjectStr);
}

exports.setUp = function (callback) {
    proj.hash = cleanHash();
    callback();
}

exports.removeSourceFile = {
    'should return a pbxFile': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('file.m');

        test.equal(newFile.constructor, pbxFile);
        test.done()
    },
    'should set a uuid on the pbxFile': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('file.m');

        test.ok(newFile.uuid);
        test.done()
    },
    'should set a fileRef on the pbxFile': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('file.m');

        test.ok(newFile.fileRef);
        test.done()
    },
    'should remove 2 fields from the PBXBuildFile section': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('file.m'),
            buildFileSection = proj.pbxBuildFileSection(),
            bfsLength = Object.keys(buildFileSection).length;

        test.equal(58, bfsLength);
        test.ok(!buildFileSection[newFile.uuid]);
        test.ok(!buildFileSection[newFile.uuid + '_comment']);

        test.done();
    },
    'should remove comment from the PBXBuildFile correctly': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('file.m'),
            commentKey = newFile.uuid + '_comment',
            buildFileSection = proj.pbxBuildFileSection();
        test.notEqual(!buildFileSection[commentKey], 'file.m in Sources');
        test.done();
    },
    'should remove the PBXBuildFile object correctly': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('file.m'),
            buildFileSection = proj.pbxBuildFileSection(),
            buildFileEntry = buildFileSection[newFile.uuid];

        test.equal(buildFileEntry, undefined);

        test.done();
    },
    'should remove 2 fields from the PBXFileReference section': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('file.m'),
            fileRefSection = proj.pbxFileReferenceSection(),
            frsLength = Object.keys(fileRefSection).length;

        test.equal(66, frsLength);
        test.ok(!fileRefSection[newFile.fileRef]);
        test.ok(!fileRefSection[newFile.fileRef + '_comment']);

        test.done();
    },
    'should remove the PBXFileReference comment correctly': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('file.m'),
            fileRefSection = proj.pbxFileReferenceSection(),
            commentKey = newFile.fileRef + '_comment';

        test.ok(!fileRefSection[commentKey]);
        test.done();
    },
    'should remove the PBXFileReference object correctly': function (test) {
        proj.addSourceFile('file.m');
        var newFile = proj.removeSourceFile('Plugins/file.m'),
            fileRefSection = proj.pbxFileReferenceSection(),
            fileRefEntry = fileRefSection[newFile.fileRef];
        test.ok(!fileRefEntry);
        test.done();
    },
    'should remove from the Plugins PBXGroup group': function (test) {
        proj.addSourceFile('Plugins/file.m');
        var newFile = proj.removeSourceFile('Plugins/file.m'),
            plugins = proj.pbxGroupByName('Plugins');
        test.equal(plugins.children.length, 0);
        test.done();
    },
    'should have the right values for the PBXGroup entry': function (test) {
        proj.addSourceFile('Plugins/file.m');
        var newFile = proj.removeSourceFile('Plugins/file.m'),
            plugins = proj.pbxGroupByName('Plugins'),
            pluginObj = plugins.children[0];

        test.ok(!pluginObj);
        test.done();
    },
    'should remove from the PBXSourcesBuildPhase': function (test) {
        proj.addSourceFile('Plugins/file.m');
        var newFile = proj.removeSourceFile('Plugins/file.m'),
            sources = proj.pbxSourcesBuildPhaseObj();

        test.equal(sources.files.length, 2);
        test.done();
    },
    'should have the right values for the Sources entry': function (test) {
        proj.addSourceFile('Plugins/file.m');
        var newFile = proj.removeSourceFile('Plugins/file.m'),
            sources = proj.pbxSourcesBuildPhaseObj(),
            sourceObj = sources.files[2];

        test.ok(!sourceObj);
        test.done();
    }
}

