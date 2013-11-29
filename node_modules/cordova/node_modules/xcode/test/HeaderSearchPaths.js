var fullProject = require('./fixtures/full-project')
    fullProjectStr = JSON.stringify(fullProject),
    pbx = require('../lib/pbxProject'),
    pbxFile = require('../lib/pbxFile'),
    proj = new pbx('.');

function cleanHash() {
    return JSON.parse(fullProjectStr);
}

exports.setUp = function (callback) {
    proj.hash = cleanHash();
    callback();
}

var PRODUCT_NAME = '"KitchenSinktablet"';

exports.addAndRemoveToFromHeaderSearchPaths = {
    'add should add the path to each configuration section':function(test) {
        proj.addToHeaderSearchPaths({
            path:'some/path/include'
        });
        var config = proj.pbxXCBuildConfigurationSection();
        for (var ref in config) {
            if (ref.indexOf('_comment') > -1 || config[ref].buildSettings.PRODUCT_NAME != PRODUCT_NAME) continue;
            var lib = config[ref].buildSettings.HEADER_SEARCH_PATHS;
            test.ok(lib[1].indexOf('$(SRCROOT)/KitchenSinktablet/some/path') > -1);
        }
        test.done();
    },
    'remove should remove from the path to each configuration section':function(test) {
        var libPath = 'some/path/include';
        proj.addToHeaderSearchPaths({
            path:libPath
        });
        proj.removeFromHeaderSearchPaths({
            path:libPath
        });
        var config = proj.pbxXCBuildConfigurationSection();
        for (var ref in config) {
            if (ref.indexOf('_comment') > -1 || config[ref].buildSettings.PRODUCT_NAME != PRODUCT_NAME) continue;
            var lib = config[ref].buildSettings.HEADER_SEARCH_PATHS;
            test.ok(lib.length === 1);
            test.ok(lib[0].indexOf('$(SRCROOT)/KitchenSinktablet/some/path/include') == -1);
        }
        test.done();
    }
}
