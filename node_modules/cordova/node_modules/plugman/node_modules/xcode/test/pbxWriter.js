var pbx = require('../lib/pbxProject'),
    fs = require('fs'),
    myProj;

function testProjectContents(filename, test) {
    var myProj = new pbx(filename),
        content = fs.readFileSync(filename, 'utf-8');

    // normalize tabs vs strings
    content = content.replace(/    /g, '\t');

    myProj.parse(function (err, projHash) {
        var written = myProj.writeSync();

        test.equal(content, written);
        test.done();
    });
}

// for debugging failing tests
function testContentsInDepth(filename, test) {
    var myProj = new pbx(filename),
        content = fs.readFileSync(filename, 'utf-8');

    // normalize tabs vs strings
    content = content.replace(/    /g, '\t');

    myProj.parse(function (err, projHash) {
        var written = myProj.writeSync(),
            writtenLines = written.split('\n')
            contentLines = content.split('\n')

        test.equal(writtenLines.length, contentLines.length);

        for (var i=0; i<writtenLines.length; i++) {
            test.equal(writtenLines[i], contentLines[i],
                'match failed on line ' + (i+1))
        }

        test.done();
    });
}

exports.writeSync = {
    'should write out the "hash" test': function (test) {
        testProjectContents('test/parser/projects/hash.pbxproj', test);
    },
    'should write out the "with_array" test': function (test) {
        testProjectContents('test/parser/projects/with_array.pbxproj', test);
    },
    'should write out the "section" test': function (test) {
        testProjectContents('test/parser/projects/section.pbxproj', test);
    },
    'should write out the "two-sections" test': function (test) {
        testProjectContents('test/parser/projects/two-sections.pbxproj', test);
    },
    'should write out the "section-entries" test': function (test) {
        testProjectContents('test/parser/projects/section-entries.pbxproj', test);
    },
    'should write out the "build-config" test': function (test) {
        testProjectContents('test/parser/projects/build-config.pbxproj', test);
    },
    'should write out the "header-search" test': function (test) {
        testProjectContents('test/parser/projects/header-search.pbxproj', test);
    },
    'should write out the "nested-object" test': function (test) {
        testProjectContents('test/parser/projects/nested-object.pbxproj', test);
    },
    'should write out the "build-files" test': function (test) {
        testProjectContents('test/parser/projects/build-files.pbxproj', test);
    },
    'should write out the "file-references" test': function (test) {
        testProjectContents('test/parser/projects/file-references.pbxproj', test);
    }
}
