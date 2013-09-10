var PEG = require('pegjs'),
    fs = require('fs'),
    pbx = fs.readFileSync('test/parser/projects/comments.pbxproj', 'utf-8'),
    grammar = fs.readFileSync('lib/parser/pbxproj.pegjs', 'utf-8'),
    parser = PEG.buildParser(grammar);

// Cordova 1.8 has the Apache headers as comments in the pbxproj file
// I DON'T KNOW WHY
exports['should ignore comments outside the main object'] = function (test) {
    parser.parse(pbx);
    test.done();
}
