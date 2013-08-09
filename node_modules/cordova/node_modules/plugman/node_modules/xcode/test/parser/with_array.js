var PEG = require('pegjs'),
    fs = require('fs'),
    pbx = fs.readFileSync('test/parser/projects/with_array.pbxproj', 'utf-8'),
    grammar = fs.readFileSync('lib/parser/pbxproj.pegjs', 'utf-8'),
    parser = PEG.buildParser(grammar),
    rawProj = parser.parse(pbx),
    project = rawProj.project;

exports['should parse arrays with commented entries'] = function (test) {
    test.ok(project.files instanceof Array);
    test.equal(project.files.length, 2);
    test.done()
}

exports['should parse arrays with uncommented entries'] = function (test) {
    test.ok(project.ARCHS instanceof Array);
    test.equal(project.ARCHS.length, 2);
    test.done()
}

exports['should parse empty arrays'] = function (test) {
    test.ok(project.empties instanceof Array);
    test.equal(project.empties.length, 0);
    test.done();
}

exports['should be correct ordered'] = function (test) {
    var archs = project.ARCHS;
    test.equal(archs[0], 'armv6');
    test.equal(archs[1], 'armv7');
    test.done();
}

exports['should parse values and comments correctly'] = function (test) {
    var appDelegate = project.files[1]
    test.equal(appDelegate.value, '1D3623260D0F684500981E51')
    test.equal(appDelegate.comment, 'AppDelegate.m in Sources')
    test.done()
}
