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

exports.removeFramework = {
    'should return a pbxFile': function (test) {
        var newFile = proj.addFramework('libsqlite3.dylib');

        test.equal(newFile.constructor, pbxFile);
        
        var deletedFile = proj.removeFramework('libsqlite3.dylib');

        test.equal(deletedFile.constructor, pbxFile);
        
        test.done()
    },
    'should set a fileRef on the pbxFile': function (test) {
        var newFile = proj.addFramework('libsqlite3.dylib');

        test.ok(newFile.fileRef);
        
        var deletedFile = proj.removeFramework('libsqlite3.dylib');

        test.ok(deletedFile.fileRef);
        
        test.done()
    },
    'should remove 2 fields from the PBXFileReference section': function (test) {
        var newFile = proj.addFramework('libsqlite3.dylib');
            fileRefSection = proj.pbxFileReferenceSection(),
            frsLength = Object.keys(fileRefSection).length;

        test.equal(68, frsLength);
        test.ok(fileRefSection[newFile.fileRef]);
        test.ok(fileRefSection[newFile.fileRef + '_comment']);

        var deletedFile = proj.removeFramework('libsqlite3.dylib');
        frsLength = Object.keys(fileRefSection).length;

        test.equal(66, frsLength);
        test.ok(!fileRefSection[deletedFile.fileRef]);
        test.ok(!fileRefSection[deletedFile.fileRef + '_comment']);
        
        test.done();
    },
    'should remove 2 fields from the PBXBuildFile section': function (test) {
        var newFile = proj.addFramework('libsqlite3.dylib'),
            buildFileSection = proj.pbxBuildFileSection(),
            bfsLength = Object.keys(buildFileSection).length;

        test.equal(60, bfsLength);
        test.ok(buildFileSection[newFile.uuid]);
        test.ok(buildFileSection[newFile.uuid + '_comment']);

        var deletedFile = proj.removeFramework('libsqlite3.dylib');
        
        bfsLength = Object.keys(buildFileSection).length;

        test.equal(58, bfsLength);
        test.ok(!buildFileSection[deletedFile.uuid]);
        test.ok(!buildFileSection[deletedFile.uuid + '_comment']);
        
        test.done();
    },
    'should remove from the Frameworks PBXGroup': function (test) {
        var newLength = proj.pbxGroupByName('Frameworks').children.length + 1,
            newFile = proj.addFramework('libsqlite3.dylib'),
            frameworks = proj.pbxGroupByName('Frameworks');

        test.equal(frameworks.children.length, newLength);
        
        var deletedFile = proj.removeFramework('libsqlite3.dylib'),
        newLength = newLength - 1;

        test.equal(frameworks.children.length, newLength);
        
        test.done();
    },
    'should remove from the PBXFrameworksBuildPhase': function (test) {
        var newFile = proj.addFramework('libsqlite3.dylib'),
            frameworks = proj.pbxFrameworksBuildPhaseObj();

        test.equal(frameworks.files.length, 16);
        
        var deletedFile = proj.removeFramework('libsqlite3.dylib'),
            frameworks = proj.pbxFrameworksBuildPhaseObj();

        test.equal(frameworks.files.length, 15);
        
        test.done();
    }
}
