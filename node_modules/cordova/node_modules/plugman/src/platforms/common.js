var shell = require('shelljs'),
    path  = require('path'),
    fs    = require('fs');

module.exports = {
    // helper for resolving source paths from plugin.xml
    // throws File Not Found
    resolveSrcPath:function(plugin_dir, relative_path) {
        var full_path = path.resolve(plugin_dir, relative_path);
        if (!fs.existsSync(full_path)) throw new Error('"' + full_path + '" not found!');
        else return full_path;
    },
    // helper for resolving target paths from plugin.xml into a cordova project
    // throws File Exists
    resolveTargetPath:function(project_dir, relative_path) {
        var full_path = path.resolve(project_dir, relative_path);
        if (fs.existsSync(full_path)) throw new Error('"' + full_path + '" already exists!');
        else return full_path;
    },
    // Many times we simply need to copy shit over, knowing if a source path doesnt exist or if a target path already exists
    copyFile:function(plugin_dir, src, project_dir, dest) {
        src = module.exports.resolveSrcPath(plugin_dir, src);
        dest = module.exports.resolveTargetPath(project_dir, dest);
        shell.mkdir('-p', path.dirname(dest));

        // XXX sheljs decides to create a directory when -R|-r is used which sucks. http://goo.gl/nbsjq
        if(fs.statSync(src).isDirectory()) {
            shell.cp('-R', src+'/*', dest);
        } else {
            shell.cp(src, dest);
        }
    },
    // checks if file exists and then deletes. Error if doesn't exist
    removeFile:function(project_dir, src) {
        var file = module.exports.resolveSrcPath(project_dir, src);
        shell.rm('-Rf', file);
    },
    // deletes file/directory without checking
    removeFileF:function(file) {
        shell.rm('-Rf', file);
    },
    // Sometimes we want to remove some java, and prune any unnecessary empty directories
    deleteJava:function(project_dir, destFile) {
        var file = path.resolve(project_dir, destFile);
        if (!fs.existsSync(file)) return;

        module.exports.removeFileF(file);

        // check if directory is empty
        var curDir = path.dirname(file);

        while(curDir !== path.resolve(project_dir, 'src')) {
            if(fs.existsSync(curDir) && fs.readdirSync(curDir) == 0) {
                fs.rmdirSync(curDir);
                curDir = path.resolve(curDir, '..');
            } else {
                // directory not empty...do nothing
                break;
            }
        }
    },
    // handle <asset> elements
    asset:{
        install:function(asset_el, plugin_dir, www_dir) {
            var src = asset_el.attrib.src;
            var target = asset_el.attrib.target;

            if (!src) {
                throw new Error('<asset> tag without required "src" attribute');
            }
            if (!target) {
                throw new Error('<asset> tag without required "target" attribute');
            }

            module.exports.copyFile(plugin_dir, src, www_dir, target);
        },
        uninstall:function(asset_el, www_dir, plugin_id) {
            var target = asset_el.attrib.target || asset_el.attrib.src;

            if (!target) {
                throw new Error('<asset> tag without required "target" attribute');
            }

            module.exports.removeFile(www_dir, target);
            module.exports.removeFileF(path.resolve(www_dir, 'plugins', plugin_id));
        }
    }
};
