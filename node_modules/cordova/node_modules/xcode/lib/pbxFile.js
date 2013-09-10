var path = require('path'),
    M_EXTENSION = /[.]m$/, SOURCE_FILE = 'sourcecode.c.objc',
    H_EXTENSION = /[.]h$/, HEADER_FILE = 'sourcecode.c.h',
    BUNDLE_EXTENSION = /[.]bundle$/, BUNDLE = '"wrapper.plug-in"',
    XIB_EXTENSION = /[.]xib$/, XIB_FILE = 'file.xib',
    DYLIB_EXTENSION = /[.]dylib$/, DYLIB = '"compiled.mach-o.dylib"',
    FRAMEWORK_EXTENSION = /[.]framework/, FRAMEWORK = 'wrapper.framework',
    DEFAULT_SOURCE_TREE = '"<group>"',
    DEFAULT_FILE_ENCODING = 4;

function detectLastType(path) {
    if (M_EXTENSION.test(path))
        return SOURCE_FILE;

    if (H_EXTENSION.test(path))
        return HEADER_FILE;

    if (BUNDLE_EXTENSION.test(path))
        return BUNDLE;

    if (XIB_EXTENSION.test(path))
        return XIB_FILE;

    if (FRAMEWORK_EXTENSION.test(path))
        return FRAMEWORK;

    if (DYLIB_EXTENSION.test(path))
        return DYLIB;

    // dunno
    return 'unknown';
}

function fileEncoding(file) {
    if (file.lastType != BUNDLE) {
        return DEFAULT_FILE_ENCODING;
    }
}

function defaultSourceTree(file) {
    if (file.lastType == DYLIB || file.lastType == FRAMEWORK) {
        return 'SDKROOT';
    } else {
        return DEFAULT_SOURCE_TREE;
    }
}

function correctPath(file, filepath) {
    if (file.lastType == FRAMEWORK) {
        return 'System/Library/Frameworks/' + filepath;
    } else if (file.lastType == DYLIB) {
        return 'usr/lib/' + filepath;
    } else {
        return filepath;
    }
}

function correctGroup(file) {
    if (file.lastType == SOURCE_FILE) {
        return 'Sources';
    } else if (file.lastType == DYLIB) {
        return 'Frameworks';
    } else {
        return 'Resources';
    }
}

function pbxFile(filepath, opt) {
    var opt = opt || {};

    this.lastType = opt.lastType || detectLastType(filepath);

    this.path = correctPath(this, filepath);
    this.basename = path.basename(filepath);
    this.group = correctGroup(this);

    this.sourceTree = opt.sourceTree || defaultSourceTree(this);
    this.fileEncoding = opt.fileEncoding || fileEncoding(this);
}

module.exports = pbxFile;
