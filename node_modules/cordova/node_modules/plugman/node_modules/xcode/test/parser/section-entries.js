var PEG = require('pegjs'),
    fs = require('fs'),
    pbx = fs.readFileSync('test/parser/projects/section-entries.pbxproj', 'utf-8'),
    grammar = fs.readFileSync('lib/parser/pbxproj.pegjs', 'utf-8'),
    parser = PEG.buildParser(grammar),
    rawProj = parser.parse(pbx),
    project = rawProj.project;

exports['should have a PBXVariantGroup section'] = function (test) {
    test.ok(project.objects['PBXVariantGroup']);
    test.done();
}

exports['should have two children for PBXVariantGroup'] = function (test) {
    test.ok(project.objects['PBXVariantGroup']['1F766FDF13BBADB100FB74C0']);
    test.ok(project.objects['PBXVariantGroup']['1F766FDC13BBADB100FB74C0']);
    test.done();
}

exports['should store quote-surround values correctly'] = function (test) {
    var localizable = project.objects['PBXVariantGroup']['1F766FDF13BBADB100FB74C0'];

    test.equal(localizable.sourceTree, '"<group>"');
    test.done();
}
