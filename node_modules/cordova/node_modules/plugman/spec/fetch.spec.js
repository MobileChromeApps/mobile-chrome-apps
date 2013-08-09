var fetch   = require('../src/fetch'),
    fs      = require('fs'),
    os      = require('osenv'),
    path    = require('path'),
    shell   = require('shelljs'),
    xml_helpers = require('../src/util/xml-helpers'),
    metadata = require('../src/util/metadata'),
    temp    = path.join(os.tmpdir(), 'plugman'),
    test_plugin = path.join(__dirname, 'plugins', 'ChildBrowser'),
    test_plugin_with_space = path.join(__dirname, 'folder with space', 'plugins', 'ChildBrowser'),
    plugins = require('../src/util/plugins');

describe('fetch', function() {
    describe('local plugins', function() {
        var xml, rm, sym, mkdir, cp, save_metadata;
        beforeEach(function() {
            xml = spyOn(xml_helpers, 'parseElementtreeSync').andReturn({
                getroot:function() { return {attrib:{id:'id'}};}
            });
            rm = spyOn(shell, 'rm');
            sym = spyOn(fs, 'symlinkSync');
            mkdir = spyOn(shell, 'mkdir');
            cp = spyOn(shell, 'cp');
            save_metadata = spyOn(metadata, 'save_fetch_metadata');
        });
        it('should copy locally-available plugin to plugins directory', function() {
            fetch(test_plugin, temp);
            expect(cp).toHaveBeenCalledWith('-R', path.join(test_plugin, '*'), path.join(temp, 'id'));
        });
        it('should copy locally-available plugin to plugins directory when spaces in path', function() {
            //XXX: added this because plugman tries to fetch from registry when plugin folder does not exist
            spyOn(fs,'existsSync').andReturn(true);
            fetch(test_plugin_with_space, temp);
            expect(cp).toHaveBeenCalledWith('-R', path.join(test_plugin_with_space, '*'), path.join(temp, 'id'));
        });
        it('should create a symlink if used with `link` param', function() {
            fetch(test_plugin, temp, { link: true });
            expect(sym).toHaveBeenCalledWith(test_plugin, path.join(temp, 'id'), 'dir');
        });
    });
    describe('remote plugins', function() {
        var clone;
        beforeEach(function() {
            clone = spyOn(plugins, 'clonePluginGitRepo');
        });
        it('should call clonePluginGitRepo for https:// and git:// based urls', function() {
            var url = "https://github.com/bobeast/GAPlugin.git";
            fetch(url, temp);
            expect(clone).toHaveBeenCalledWith(url, temp, '.', undefined, jasmine.any(Function));
        });
        it('should call clonePluginGitRepo with subdir if applicable', function() {
            var url = "https://github.com/bobeast/GAPlugin.git";
            var dir = 'fakeSubDir';
            fetch(url, temp, { subdir: dir });
            expect(clone).toHaveBeenCalledWith(url, temp, dir, undefined, jasmine.any(Function));
        });
        it('should call clonePluginGitRepo with subdir and git ref if applicable', function() {
            var url = "https://github.com/bobeast/GAPlugin.git";
            var dir = 'fakeSubDir';
            var ref = 'fakeGitRef';
            fetch(url, temp, { subdir: dir, git_ref: ref });
            expect(clone).toHaveBeenCalledWith(url, temp, dir, ref, jasmine.any(Function));
        });
        it('should throw if used with url and `link` param', function() {
            expect(function() {
                fetch("https://github.com/bobeast/GAPlugin.git", temp, {link:true});
            }).toThrow('--link is not supported for git URLs');
        });
    });
});
