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

exports.addSourceFile = {
    'should return a pbxFile': function (test) {
        var newFile = proj.addSourceFile('file.m');

        test.equal(newFile.constructor, pbxFile);
        test.done()
    },
    'should set a uuid on the pbxFile': function (test) {
        var newFile = proj.addSourceFile('file.m');

        test.ok(newFile.uuid);
        test.done()
    },
    'should set a fileRef on the pbxFile': function (test) {
        var newFile = proj.addSourceFile('file.m');

        test.ok(newFile.fileRef);
        test.done()
    },
    'should populate the PBXBuildFile section with 2 fields': function (test) {
        var newFile = proj.addSourceFile('file.m'),
            buildFileSection = proj.pbxBuildFileSection(),
            bfsLength = Object.keys(buildFileSection).length;

        test.equal(60, bfsLength);
        test.ok(buildFileSection[newFile.uuid]);
        test.ok(buildFileSection[newFile.uuid + '_comment']);

        test.done();
    },
    'should add the PBXBuildFile comment correctly': function (test) {
        var newFile = proj.addSourceFile('file.m'),
            commentKey = newFile.uuid + '_comment',
            buildFileSection = proj.pbxBuildFileSection();

        test.equal(buildFileSection[commentKey], 'file.m in Sources');
        test.done();
    },
    'should add the PBXBuildFile object correctly': function (test) {
        var newFile = proj.addSourceFile('file.m'),
            buildFileSection = proj.pbxBuildFileSection(),
            buildFileEntry = buildFileSection[newFile.uuid];

        test.equal(buildFileEntry.isa, 'PBXBuildFile');
        test.equal(buildFileEntry.fileRef, newFile.fileRef);
        test.equal(buildFileEntry.fileRef_comment, 'file.m');

        test.done();
    },
    'should populate the PBXFileReference section with 2 fields': function (test) {
        var newFile = proj.addSourceFile('file.m'),
            fileRefSection = proj.pbxFileReferenceSection(),
            frsLength = Object.keys(fileRefSection).length;

        test.equal(68, frsLength);
        test.ok(fileRefSection[newFile.fileRef]);
        test.ok(fileRefSection[newFile.fileRef + '_comment']);

        test.done();
    },
    'should populate the PBXFileReference comment correctly': function (test) {
        var newFile = proj.addSourceFile('file.m'),
            fileRefSection = proj.pbxFileReferenceSection(),
            commentKey = newFile.fileRef + '_comment';

        test.equal(fileRefSection[commentKey], 'file.m');
        test.done();
    },
    'should add the PBXFileReference object correctly': function (test) {
        var newFile = proj.addSourceFile('Plugins/file.m'),
            fileRefSection = proj.pbxFileReferenceSection(),
            fileRefEntry = fileRefSection[newFile.fileRef];

        test.equal(fileRefEntry.isa, 'PBXFileReference');
        test.equal(fileRefEntry.fileEncoding, 4);
        test.equal(fileRefEntry.lastKnownFileType, 'sourcecode.c.objc');
        test.equal(fileRefEntry.name, '"file.m"');
        test.equal(fileRefEntry.path, '"file.m"');
        test.equal(fileRefEntry.sourceTree, '"<group>"');

        test.done();
    },
    'should add to the Plugins PBXGroup group': function (test) {
        var newFile = proj.addSourceFile('Plugins/file.m'),
            plugins = proj.pbxGroupByName('Plugins');

        test.equal(plugins.children.length, 1);
        test.done();
    },
    'should have the right values for the PBXGroup entry': function (test) {
        var newFile = proj.addSourceFile('Plugins/file.m'),
            plugins = proj.pbxGroupByName('Plugins'),
            pluginObj = plugins.children[0];

        test.equal(pluginObj.comment, 'file.m');
        test.equal(pluginObj.value, newFile.fileRef);
        test.done();
    },
    'should add to the PBXSourcesBuildPhase': function (test) {
        var newFile = proj.addSourceFile('Plugins/file.m'),
            sources = proj.pbxSourcesBuildPhaseObj();

        test.equal(sources.files.length, 3);
        test.done();
    },
    'should have the right values for the Sources entry': function (test) {
        var newFile = proj.addSourceFile('Plugins/file.m'),
            sources = proj.pbxSourcesBuildPhaseObj(),
            sourceObj = sources.files[2];

        test.equal(sourceObj.comment, 'file.m in Sources');
        test.equal(sourceObj.value, newFile.uuid);
        test.done();
    },
    'duplicate entries': {
        'should return false': function (test) {
            var newFile = proj.addSourceFile('Plugins/file.m'); 

            test.ok(!proj.addSourceFile('Plugins/file.m'));
            test.done();
        },
        'should not add another entry anywhere': function (test) {
            var newFile = proj.addSourceFile('Plugins/file.m'),
                buildFileSection = proj.pbxBuildFileSection(),
                bfsLength = Object.keys(buildFileSection).length,
                fileRefSection = proj.pbxFileReferenceSection(),
                frsLength = Object.keys(fileRefSection).length,
                plugins = proj.pbxGroupByName('Plugins'),
                sources = proj.pbxSourcesBuildPhaseObj();

            // duplicate!
            proj.addSourceFile('Plugins/file.m');

            test.equal(60, bfsLength);              // BuildFileSection
            test.equal(68, frsLength);              // FileReferenceSection
            test.equal(plugins.children.length, 1); // Plugins pbxGroup
            test.equal(sources.files.length, 3);    // SourcesBuildPhhase
            test.done();
        }
    }
}

