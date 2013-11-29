var xcode5proj = require('./fixtures/library-search-paths')
    xcode5projStr = JSON.stringify(xcode5proj),
    pbx = require('../lib/pbxProject'),
    pbxFile = require('../lib/pbxFile'),
    proj = new pbx('.'),
    libPoop = { path: 'some/path/poop.a' };

function cleanHash() {
    return JSON.parse(xcode5projStr);
}

exports.setUp = function (callback) {
    proj.hash = cleanHash();
    callback();
}

var PRODUCT_NAME = '"$(TARGET_NAME)"';

exports.addAndRemoveToFromLibrarySearchPaths = {
    'add should add the path to each configuration section':function(test) {
        var expected = '"\\"$(SRCROOT)/$(TARGET_NAME)/some/path\\""',
            config = proj.pbxXCBuildConfigurationSection(),
            ref, lib, refSettings;

        proj.addToLibrarySearchPaths(libPoop);

        for (ref in config) {
            if (ref.indexOf('_comment') > -1)
                continue;

            refSettings = config[ref].buildSettings;

            if (refSettings.PRODUCT_NAME != PRODUCT_NAME)
                continue;

            lib = refSettings.LIBRARY_SEARCH_PATHS;
            test.equal(lib[1], expected);
        }
        test.done();
    },

    'remove should remove from the path to each configuration section':function(test) {
        var config, ref, lib;

        proj.addToLibrarySearchPaths(libPoop);
        proj.removeFromLibrarySearchPaths(libPoop);

        config = proj.pbxXCBuildConfigurationSection();
        for (ref in config) {
            if (ref.indexOf('_comment') > -1 || config[ref].buildSettings.PRODUCT_NAME != PRODUCT_NAME) continue;

            lib = config[ref].buildSettings.LIBRARY_SEARCH_PATHS;
            test.ok(lib.length === 1);
            test.ok(lib[0].indexOf('$(SRCROOT)/KitchenSinktablet/some/path') == -1);
        }
        test.done();
    }
}
