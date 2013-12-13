// API is a bit wonky right now
var xcode = require('./index'),
    fs = require('fs'),
    projectPath = '/Users/anis/tmp/example/CordovaTest.xcodeproj/project.pbxproj',
//    projectPathNew = '/Users/anis/tmp/project.pbxproj.nodeXCODE',
    myProj = xcode.project(projectPath);

// parsing is async, in a different process
myProj.parse(function (err) {
    myProj.removeFramework('/Users/anis/tmp/example/FacebookSDK.framework', {customFramework: true});

    fs.writeFileSync(projectPath, myProj.writeSync());
    console.log('new project written');
});
