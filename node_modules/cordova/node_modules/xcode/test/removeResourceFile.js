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

exports.removeResourceFile = {
    'should return a pbxFile': function (test) {
        var newFile = proj.addResourceFile('assets.bundle');

        test.equal(newFile.constructor, pbxFile);
        
        var deletedFile = proj.removeResourceFile('assets.bundle');

        test.equal(deletedFile.constructor, pbxFile);

        test.done()
    },
    'should set a uuid on the pbxFile': function (test) {
        var newFile = proj.addResourceFile('assets.bundle');

        test.ok(newFile.uuid);
        
        var deletedFile = proj.removeResourceFile('assets.bundle');
        
        test.ok(deletedFile.uuid);
        
        test.done()
    },
    'should set a fileRef on the pbxFile': function (test) {
        var newFile = proj.addResourceFile('assets.bundle');

        test.ok(newFile.fileRef);
        
        var deletedFile = proj.removeResourceFile('assets.bundle');

        test.ok(deletedFile.fileRef);
        
        test.done()
    },
    'should remove 2 fields from the PBXBuildFile section': function (test) {
        var newFile = proj.addResourceFile('assets.bundle'),
            buildFileSection = proj.pbxBuildFileSection(),
            bfsLength = Object.keys(buildFileSection).length;

        test.equal(60, bfsLength);
        test.ok(buildFileSection[newFile.uuid]);
        test.ok(buildFileSection[newFile.uuid + '_comment']);

        var deletedFile = proj.removeResourceFile('assets.bundle'),
            buildFileSection = proj.pbxBuildFileSection(),
            bfsLength = Object.keys(buildFileSection).length;

        test.equal(58, bfsLength);
        test.ok(!buildFileSection[deletedFile.uuid]);
        test.ok(!buildFileSection[deletedFile.uuid + '_comment']);
        
        test.done();
    },
    'should remove the PBXBuildFile comment correctly': function (test) {
        var newFile = proj.addResourceFile('assets.bundle'),
            commentKey = newFile.uuid + '_comment',
            buildFileSection = proj.pbxBuildFileSection();

        test.equal(buildFileSection[commentKey], 'assets.bundle in Resources');
        
        var deletedFile = proj.removeResourceFile('assets.bundle'),
            commentKey = deletedFile.uuid + '_comment',
            buildFileSection = proj.pbxBuildFileSection();

        test.ok(!buildFileSection[commentKey]);
        
        test.done();
    },
    'should remove the PBXBuildFile object correctly': function (test) {
        var newFile = proj.addResourceFile('assets.bundle'),
            buildFileSection = proj.pbxBuildFileSection(),
            buildFileEntry = buildFileSection[newFile.uuid];

        test.equal(buildFileEntry.isa, 'PBXBuildFile');
        test.equal(buildFileEntry.fileRef, newFile.fileRef);
        test.equal(buildFileEntry.fileRef_comment, 'assets.bundle');

        var deletedFile = proj.removeResourceFile('assets.bundle'),
            buildFileSection = proj.pbxBuildFileSection(),
            buildFileEntry = buildFileSection[deletedFile.uuid];

        test.ok(!buildFileEntry);
        
        test.done();
    },
    'should remove 2 fields from the PBXFileReference section': function (test) {
        var newFile = proj.addResourceFile('assets.bundle'),
            fileRefSection = proj.pbxFileReferenceSection(),
            frsLength = Object.keys(fileRefSection).length;

        test.equal(68, frsLength);
        test.ok(fileRefSection[newFile.fileRef]);
        test.ok(fileRefSection[newFile.fileRef + '_comment']);

        var deletedFile = proj.removeResourceFile('assets.bundle'),
            fileRefSection = proj.pbxFileReferenceSection(),
            frsLength = Object.keys(fileRefSection).length;

        test.equal(66, frsLength);
        test.ok(!fileRefSection[deletedFile.fileRef]);
        test.ok(!fileRefSection[deletedFile.fileRef + '_comment']);

        test.done();
    },
    'should populate the PBXFileReference comment correctly': function (test) {
        var newFile = proj.addResourceFile('assets.bundle'),
            fileRefSection = proj.pbxFileReferenceSection(),
            commentKey = newFile.fileRef + '_comment';

        test.equal(fileRefSection[commentKey], 'assets.bundle');
        
        var deletedFile = proj.removeResourceFile('assets.bundle'),
            fileRefSection = proj.pbxFileReferenceSection(),
            commentKey = deletedFile.fileRef + '_comment';

        test.ok(!fileRefSection[commentKey]);
        test.done();
    },
    'should remove the PBXFileReference object correctly': function (test) {
        delete proj.pbxGroupByName('Resources').path;

        var newFile = proj.addResourceFile('Resources/assets.bundle'),
            fileRefSection = proj.pbxFileReferenceSection(),
            fileRefEntry = fileRefSection[newFile.fileRef];

        test.equal(fileRefEntry.isa, 'PBXFileReference');
        test.equal(fileRefEntry.fileEncoding, undefined);
        test.equal(fileRefEntry.lastKnownFileType, '"wrapper.plug-in"');
        test.equal(fileRefEntry.name, 'assets.bundle');
        test.equal(fileRefEntry.path, 'Resources/assets.bundle');
        test.equal(fileRefEntry.sourceTree, '"<group>"');

        var deletedFile = proj.removeResourceFile('Resources/assets.bundle'),
            fileRefSection = proj.pbxFileReferenceSection(),
            fileRefEntry = fileRefSection[deletedFile.fileRef];

        test.ok(!fileRefEntry);

        test.done();
    },
    'should remove from the Resources PBXGroup group': function (test) {
        var newFile = proj.addResourceFile('Resources/assets.bundle'),
            resources = proj.pbxGroupByName('Resources');

        test.equal(resources.children.length, 10);
        
        var deletedFile = proj.removeResourceFile('Resources/assets.bundle'),
            resources = proj.pbxGroupByName('Resources');

        test.equal(resources.children.length, 9);
        test.done();
    },
    'should remove from the PBXSourcesBuildPhase': function (test) {
        var newFile = proj.addResourceFile('Resources/assets.bundle'),
            sources = proj.pbxResourcesBuildPhaseObj();

        test.equal(sources.files.length, 13);
        
        var deletedFile = proj.removeResourceFile('Resources/assets.bundle'),
            sources = proj.pbxResourcesBuildPhaseObj();

        test.equal(sources.files.length, 12);
        test.done();
    },
    tearDown: function (callback) {
        delete proj.pbxGroupByName('Resources').path;
        callback();
    }
}
