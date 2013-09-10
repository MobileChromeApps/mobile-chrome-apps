var PEG = require('pegjs'),
    fs = require('fs'),
    pbx = fs.readFileSync('test/parser/projects/section.pbxproj', 'utf-8'),
    grammar = fs.readFileSync('lib/parser/pbxproj.pegjs', 'utf-8'),
    parser = PEG.buildParser(grammar),
    rawProj = parser.parse(pbx),
    project = rawProj.project;

exports['should have a PBXTargetDependency section'] = function (test) {
    test.ok(project.objects['PBXTargetDependency']);
    test.done();
}

exports['should have the right child of PBXTargetDependency section'] = function (test) {
    test.ok(project.objects['PBXTargetDependency']['301BF551109A68C00062928A']);
    test.done();
}

exports['should have the right properties on the dependency'] = function (test) {
    var dependency = project.objects['PBXTargetDependency']['301BF551109A68C00062928A'];

    test.equal(dependency.isa, 'PBXTargetDependency')
    test.equal(dependency.name, 'PhoneGapLib')
    test.equal(dependency.targetProxy, '301BF550109A68C00062928A')
    test.equal(dependency['targetProxy_comment'], 'PBXContainerItemProxy')

    test.done();
}
