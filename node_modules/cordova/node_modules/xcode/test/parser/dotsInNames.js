var PEG = require('pegjs'),
    fs = require('fs'),
    pbx = fs.readFileSync('test/parser/projects/dots-in-names.pbxproj', 'utf-8'),
    grammar = fs.readFileSync('lib/parser/pbxproj.pegjs', 'utf-8'),
    parser = PEG.buildParser(grammar),
    rawProj = parser.parse(pbx),
    project = rawProj.project;

exports['should parse com.apple.BackgroundModes'] = function (test) {
    var targets = project.attributes.TargetAttributes['1D6058900D05DD3D006BFB54'],
        backgroundModes = targets.SystemCapabilities['com.apple.BackgroundModes'];

    test.deepEqual(backgroundModes, {enabled: 1});
    test.done()
}
