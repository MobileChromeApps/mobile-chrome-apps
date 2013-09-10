var pbxFile = require('../lib/pbxFile');

exports['lastType'] = {
    'should detect that a .m path means sourcecode.c.objc': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.m');

        test.equal('sourcecode.c.objc', sourceFile.lastType);
        test.done();
    },

    'should detect that a .h path means sourceFile.c.h': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.h');

        test.equal('sourcecode.c.h', sourceFile.lastType);
        test.done();
    },

    'should detect that a .bundle path means "wrapper.plug-in"': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.bundle');

        test.equal('"wrapper.plug-in"', sourceFile.lastType);
        test.done();
    },

    'should detect that a .xib path means file.xib': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.xib');

        test.equal('file.xib', sourceFile.lastType);
        test.done();
    },

    'should detect that a .dylib path means "compiled.mach-o.dylib"': function (test) {
        var sourceFile = new pbxFile('libsqlite3.dylib');

        test.equal('"compiled.mach-o.dylib"', sourceFile.lastType);
        test.done();
    },

    'should detect that a .framework path means wrapper.framework': function (test) {
        var sourceFile = new pbxFile('MessageUI.framework');

        test.equal('wrapper.framework', sourceFile.lastType);
        test.done();
    },

    'should allow lastType to be overridden': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.m',
                { lastType: 'somestupidtype' });

        test.equal('somestupidtype', sourceFile.lastType);
        test.done();
    },

    'should set lastType to unknown if undetectable': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.guh');

        test.equal('unknown', sourceFile.lastType);
        test.done();
    }
}

exports['group'] = {
    'should be Sources for source files': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.m');

        test.equal('Sources', sourceFile.group);
        test.done();
    },
    'should be Frameworks for frameworks': function (test) {
        var framework = new pbxFile('libsqlite3.dylib');

        test.equal('Frameworks', framework.group);
        test.done();
    },
    'should be Resources for all other files': function (test) {
        var headerFile = new pbxFile('Plugins/ChildBrowser.h'),
            xibFile = new pbxFile('Plugins/ChildBrowser.xib');

        test.equal('Resources', headerFile.group);
        test.equal('Resources', xibFile.group);
        test.done();
    }
}

exports['basename'] = {
    'should be as expected': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.m');

        test.equal('ChildBrowser.m', sourceFile.basename);
        test.done();
    }
}

exports['sourceTree'] = {
    'should be SDKROOT for dylibs': function (test) {
        var sourceFile = new pbxFile('libsqlite3.dylib');

        test.equal('SDKROOT', sourceFile.sourceTree);
        test.done();
    },

    'should be SDKROOT for frameworks': function (test) {
        var sourceFile = new pbxFile('MessageUI.framework');

        test.equal('SDKROOT', sourceFile.sourceTree);
        test.done();
    },

    'should default to "<group>" otherwise': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.m');

        test.equal('"<group>"', sourceFile.sourceTree);
        test.done();
    },

    'should be overridable either way': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.m',
            { sourceTree: 'SOMETHING'});

        test.equal('SOMETHING', sourceFile.sourceTree);
        test.done();
    }
}

exports['path'] = {
    'should be "usr/lib" for dylibs (relative to SDKROOT)': function (test) {
        var sourceFile = new pbxFile('libsqlite3.dylib');

        test.equal('usr/lib/libsqlite3.dylib', sourceFile.path);
        test.done();
    },

    'should be "System/Library/Frameworks" for frameworks': function (test) {
        var sourceFile = new pbxFile('MessageUI.framework');

        test.equal('System/Library/Frameworks/MessageUI.framework', sourceFile.path);
        test.done();
    },


    'should default to the first argument otherwise': function (test) {
        var sourceFile = new pbxFile('Plugins/ChildBrowser.m');

        test.equal('Plugins/ChildBrowser.m', sourceFile.path);
        test.done();
    }
}
