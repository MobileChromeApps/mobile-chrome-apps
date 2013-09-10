var PEG = require('pegjs'),
    fs = require('fs'),
    pbx = fs.readFileSync('test/parser/projects/hash.pbxproj', 'utf-8'),
    grammar = fs.readFileSync('lib/parser/pbxproj.pegjs', 'utf-8'),
    parser = PEG.buildParser(grammar),
    rawProj = parser.parse(pbx),
    project = rawProj.project;

exports['should have the top-line comment in place'] = function (test) {
    test.equals(rawProj.headComment, '!$*UTF8*$!');
    test.done()
}

exports['should parse a numeric attribute'] = function (test) {
    test.strictEqual(project.archiveVersion, 1);
    test.strictEqual(project.objectVersion, 45);
    test.done()
}

exports['should parse an empty object'] = function (test) {
    var empty = project.classes;
    test.equal(Object.keys(empty).length, 0);
    test.done()
}

exports['should split out properties and comments'] = function (test) {
    test.equal(project.rootObject, '29B97313FDCFA39411CA2CEA');
    test.equal(project['rootObject_comment'], 'Project object');
    test.done();
}

exports['should parse non-commented hash things'] = function (test) {
    test.equal(project.nonObject, '29B97313FDCFA39411CA2CEF');
    test.done();
}
