var PEG = require('pegjs'),
    fs = require('fs'),
    pbx = fs.readFileSync('test/parser/projects/header-search.pbxproj', 'utf-8'),
    grammar = fs.readFileSync('lib/parser/pbxproj.pegjs', 'utf-8'),
    parser = PEG.buildParser(grammar),
    rawProj = parser.parse(pbx),
    project = rawProj.project;

exports['should read a decimal value correctly'] = function (test) {
    var debug = project.objects['XCBuildConfiguration']['C01FCF4F08A954540054247B'],
        hsPaths = debug.buildSettings['HEADER_SEARCH_PATHS'],
        expected = '"\\"$(TARGET_BUILD_DIR)/usr/local/lib/include\\""';

    test.equal(hsPaths[0], expected);
    test.done();
}
