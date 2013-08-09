var fullProject = require('./fixtures/full-project')
    fullProjectStr = JSON.stringify(fullProject),
    pbx = require('../lib/pbxProject'),
    pbxFile = require('../lib/pbxFile'),
    proj = new pbx('.');

function cleanHash() {
    return JSON.parse(fullProjectStr);
}

function nonComments(obj) {
    var keys = Object.keys(obj),
        newObj = {}, i = 0;

    for (i; i < keys.length; i++) {
        if (!/_comment$/.test(keys[i])) {
            newObj[keys[i]] = obj[keys[i]];
        }
    }

    return newObj;
}

function librarySearchPaths(proj) {
    var configs = nonComments(proj.pbxXCBuildConfigurationSection()),
        allPaths = [],
        ids = Object.keys(configs), i, buildSettings;

    for (i = 0; i< ids.length; i++) {
        buildSettings = configs[ids[i]].buildSettings;

        if (buildSettings['LIBRARY_SEARCH_PATHS']) {
            allPaths.push(buildSettings['LIBRARY_SEARCH_PATHS']);
        }
    }

    return allPaths;
}

exports.setUp = function (callback) {
    proj.hash = cleanHash();
    callback();
}

exports.addStaticLibrary = {
    'should return a pbxFile': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a');

        test.equal(newFile.constructor, pbxFile);
        test.done()
    },
    'should set a fileRef on the pbxFile': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a');

        test.ok(newFile.fileRef);
        test.done()
    },
    'should populate the PBXBuildFile section with 2 fields': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a');
            buildFileSection = proj.pbxBuildFileSection(),
            bfsLength = Object.keys(buildFileSection).length;

        test.equal(60, bfsLength);
        test.ok(buildFileSection[newFile.uuid]);
        test.ok(buildFileSection[newFile.uuid + '_comment']);

        test.done();
    },
    'should populate the PBXBuildFile section with 2 fields as plugin': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a',
                { plugin: true });
            buildFileSection = proj.pbxBuildFileSection(),
            bfsLength = Object.keys(buildFileSection).length;

        test.equal(60, bfsLength);
        test.ok(buildFileSection[newFile.uuid]);
        test.ok(buildFileSection[newFile.uuid + '_comment']);

        test.done();
    },
    'should add the PBXBuildFile comment correctly': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a');
            commentKey = newFile.uuid + '_comment',
            buildFileSection = proj.pbxBuildFileSection();

        test.equal(buildFileSection[commentKey], 'libGoogleAnalytics.a in Frameworks');
        test.done();
    },
    'should add the PBXBuildFile object correctly': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a');
            buildFileSection = proj.pbxBuildFileSection(),
            buildFileEntry = buildFileSection[newFile.uuid];

        test.equal(buildFileEntry.isa, 'PBXBuildFile');
        test.equal(buildFileEntry.fileRef, newFile.fileRef);
        test.equal(buildFileEntry.fileRef_comment, 'libGoogleAnalytics.a');

        test.done();
    },
    'should populate the PBXFileReference section with 2 fields': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a');
            fileRefSection = proj.pbxFileReferenceSection(),
            frsLength = Object.keys(fileRefSection).length;

        test.equal(68, frsLength);
        test.ok(fileRefSection[newFile.fileRef]);
        test.ok(fileRefSection[newFile.fileRef + '_comment']);

        test.done();
    },
    'should populate the PBXFileReference comment correctly': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a');
            fileRefSection = proj.pbxFileReferenceSection(),
            commentKey = newFile.fileRef + '_comment';

        test.equal(fileRefSection[commentKey], 'libGoogleAnalytics.a');
        test.done();
    },
    'should add the PBXFileReference object correctly': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a'),
            fileRefSection = proj.pbxFileReferenceSection(),
            fileRefEntry = fileRefSection[newFile.fileRef];

        test.equal(fileRefEntry.isa, 'PBXFileReference');
        test.equal(fileRefEntry.lastKnownFileType, 'archive.ar');
        test.equal(fileRefEntry.name, '"libGoogleAnalytics.a"');
        test.equal(fileRefEntry.path, '"libGoogleAnalytics.a"');
        test.equal(fileRefEntry.sourceTree, '"<group>"');

        test.done();
    },
    'should add to the PBXFrameworksBuildPhase': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a'),
            frameworks = proj.pbxFrameworksBuildPhaseObj();

        test.equal(frameworks.files.length, 16);
        test.done();
    },
    'should have the right values for the Sources entry': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a'),
            frameworks = proj.pbxFrameworksBuildPhaseObj(),
            framework = frameworks.files[15];

        test.equal(framework.comment, 'libGoogleAnalytics.a in Frameworks');
        test.equal(framework.value, newFile.uuid);
        test.done();
    },
    'should set LIBRARY_SEARCH_PATHS for appropriate build configurations': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a'),
            configs = nonComments(proj.pbxXCBuildConfigurationSection()),
            ids = Object.keys(configs), i, buildSettings;

        for (i = 0; i< ids.length; i++) {
            buildSettings = configs[ids[i]].buildSettings;

            if (buildSettings['PRODUCT_NAME'] == '"KitchenSinktablet"') {
                test.ok(buildSettings['LIBRARY_SEARCH_PATHS']);
            }
        }

        test.done();
    },
    'should ensure LIBRARY_SEARCH_PATHS inherits defaults correctly': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a'),
            libraryPaths = librarySearchPaths(proj),
            expectedPath = '"\\"$(SRCROOT)/KitchenSinktablet\\""',
            i, current;

        for (i = 0; i < libraryPaths.length; i++) {
            current = libraryPaths[i];
            test.ok(current.indexOf('"$(inherited)"') >= 0);
        }

        test.done();
    },
    'should ensure the new library is in LIBRARY_SEARCH_PATHS': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a'),
            libraryPaths = librarySearchPaths(proj),
            expectedPath = '"\\"$(SRCROOT)/KitchenSinktablet\\""',
            i, current;

        for (i = 0; i < libraryPaths.length; i++) {
            current = libraryPaths[i];
            test.ok(current.indexOf(expectedPath) >= 0);
        }

        test.done();
    },
    'should add to the Plugins group, optionally': function (test) {
        var newFile = proj.addStaticLibrary('libGoogleAnalytics.a',
                                        { plugin: true }),
            plugins = proj.pbxGroupByName('Plugins');

        test.equal(plugins.children.length, 1);
        test.done();
    },
    'should add the right LIBRARY_SEARCH_PATHS entry for plugins': {
        'with group set': function (test) {
            plugins = proj.pbxGroupByName('Plugins');
            plugins.path = '"Test200/Plugins"';

            var newFile = proj.addStaticLibrary('Plugins/libGoogleAnalytics.a',
                                            { plugin: true }),
                libraryPaths = librarySearchPaths(proj),
                expectedPath = '"\\"$(SRCROOT)/Test200/Plugins\\""',
                i, current;

            for (i = 0; i < libraryPaths.length; i++) {
                current = libraryPaths[i];
                test.ok(current.indexOf(expectedPath) >= 0,
                       expectedPath + ' not found in ' + current);
            }

            test.done();
        },
        'without group set': function (test) {
            plugins = proj.pbxGroupByName('Plugins');
            delete plugins.path;

            var newFile = proj.addStaticLibrary('Plugins/libGoogleAnalytics.a',
                                            { plugin: true }),
                libraryPaths = librarySearchPaths(proj),
                expectedPath = '"\\"$(SRCROOT)/KitchenSinktablet/Plugins\\""',
                i, current;

            for (i = 0; i < libraryPaths.length; i++) {
                current = libraryPaths[i];
                test.ok(current.indexOf(expectedPath) >= 0,
                       expectedPath + ' not found in ' + current);
            }

            test.done();
        }
    },
    'duplicate entries': {
        'should return false': function (test) {
            var newFile = proj.addStaticLibrary('libGoogleAnalytics.a'); 

            test.ok(!proj.addStaticLibrary('libGoogleAnalytics.a'));
            test.done();
        },
        'should return false (plugin entries)': function (test) {
            var newFile = proj.addStaticLibrary('Plugins/libGoogleAnalytics.a',
                                                { plugin: true }); 

            test.ok(!proj.addStaticLibrary('Plugins/libGoogleAnalytics.a',
                                                { plugin: true }));
            test.done();
        },
    }
}
