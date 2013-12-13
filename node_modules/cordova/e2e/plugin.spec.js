
var helpers = require('./helpers'),
    path = require('path'),
    fs = require('fs'),
    shell = require('shelljs'),
    Q = require('q'),
    events = require('../src/events'),
    cordova = require('../cordova');

var tmpDir = helpers.tmpDir('plugin_test');
var project = path.join(tmpDir, 'project');
var pluginsDir = path.join(__dirname, 'fixtures', 'plugins');
var pluginId = 'org.apache.cordova.fakeplugin1';

describe('plugin end-to-end', function() {
    var results;

    beforeEach(function() {
        shell.rm('-rf', project);
    });
    afterEach(function() {
        process.chdir(path.join(__dirname, '..'));  // Needed to rm the dir on Windows.
        shell.rm('-rf', tmpDir);
    });

    // The flow tested is: ls, add, ls, rm, ls.
    // Plugin dependencies are not tested as that should be corvered in plugman tests.
    // TODO (kamrik): Test the 'plugin search' command.
    it('should successfully run', function(done) {
        // cp then mv because we need to copy everything, but that means it'll copy the whole directory.
        // Using /* doesn't work because of hidden files.
        shell.cp('-R', path.join(__dirname, 'fixtures', 'base'), tmpDir);
        shell.mv(path.join(tmpDir, 'base'), project);
        // Copy some platform to avoid working on a project with no platforms.
        shell.cp('-R', path.join(__dirname, 'fixtures', 'platforms', helpers.testPlatform), path.join(project, 'platforms'));
        process.chdir(project);

        events.on('results', function(res) { results = res; });

        // Check there are no plugins yet.
        cordova.raw.plugin('list').then(function() {
            expect(results).toMatch(/No plugins added/gi);
        }).then(function() {
            // Add a fake plugin from fixtures.
            return cordova.raw.plugin('add', path.join(pluginsDir, 'fake1'));
        }).then(function() {
           expect(path.join(project, 'plugins', pluginId, 'plugin.xml')).toExist();
        }).then(function() {
            return cordova.raw.plugin('ls');
        }).then(function() {
            expect(results).toContain(pluginId);
            expect(results.length).toEqual(1);
        }).then(function() {
            // And now remove it.
            return cordova.raw.plugin('rm', pluginId);
        }).then(function() {
            // The whole dir should be gone.
            expect(path.join(project, 'plugins', pluginId)).not.toExist();
        }).then(function() {
            return cordova.raw.plugin('ls');
        }).then(function() {
            expect(results).toMatch(/No plugins added/gi);
        }).fail(function(err) {
            console.log(err);
            expect(err).toBeUndefined();
        }).fin(done);
    });
});
