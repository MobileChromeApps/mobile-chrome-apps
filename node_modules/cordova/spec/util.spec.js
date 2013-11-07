/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/
var cordova = require('../cordova'),
    shell = require('shelljs'),
    path = require('path'),
    fs = require('fs'),
    util = require('../src/util'),
    temp = path.join(__dirname, '..', 'temp'),
    fixtures = path.join(__dirname, 'fixtures');

var cwd = process.cwd();
var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

describe('util module', function() {
    describe('isCordova method', function() {
        it('should return false if it hits the home directory', function() {
            var somedir = path.join(home, 'somedir');
            this.after(function() {
                shell.rm('-rf', somedir);
            });
            shell.mkdir(somedir);
            expect(util.isCordova(somedir)).toEqual(false);
        });
        it('should return false if it cannot find a .cordova directory up the directory tree', function() {
            var somedir = path.join(home, '..');
            expect(util.isCordova(somedir)).toEqual(false);
        });
        it('should return the first directory it finds with a .cordova folder in it', function() {
            var somedir = path.join(home,'somedir');
            var anotherdir = path.join(somedir, 'anotherdir');
            this.after(function() {
                shell.rm('-rf', somedir);
            });
            shell.mkdir('-p', anotherdir);
            shell.mkdir(path.join(somedir, '.cordova'));
            expect(util.isCordova(somedir)).toEqual(somedir);
        });
    });
    describe('deleteSvnFolders method', function() {
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        it('should delete .svn folders in any subdirectory of specified dir', function() {
            var one = path.join(temp, 'one');
            var two = path.join(temp, 'two');
            var one_svn = path.join(one, '.svn');
            var two_svn = path.join(two, '.svn');
            shell.mkdir('-p', one_svn);
            shell.mkdir('-p', two_svn);
            util.deleteSvnFolders(temp);
            expect(fs.existsSync(one_svn)).toEqual(false);
            expect(fs.existsSync(two_svn)).toEqual(false);
        });
    });
    describe('listPlatforms method', function() {
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        it('should only return supported platform directories present in a cordova project dir', function() {
            var platforms = path.join(temp, 'platforms');
            var android = path.join(platforms, 'android');
            var ios = path.join(platforms, 'ios');
            var wp7 = path.join(platforms, 'wp7');
            var atari = path.join(platforms, 'atari');
            shell.mkdir('-p', android);
            shell.mkdir('-p', ios);
            shell.mkdir('-p', wp7);
            shell.mkdir('-p', atari);
            var res = util.listPlatforms(temp);
            expect(res.length).toEqual(3);
            expect(res.indexOf('atari')).toEqual(-1);
        });
    });
    describe('findPlugins method', function() {
        afterEach(function() {
            shell.rm('-rf', temp);
        });
        it('should only return plugin directories present in a cordova project dir', function() {
            var plugins = path.join(temp, 'plugins');
            var android = path.join(plugins, 'android');
            var ios = path.join(plugins, 'ios');
            var wp7 = path.join(plugins, 'wp7');
            var atari = path.join(plugins, 'atari');
            shell.mkdir('-p', android);
            shell.mkdir('-p', ios);
            shell.mkdir('-p', wp7);
            shell.mkdir('-p', atari);
            var res = util.findPlugins(plugins);
            expect(res.length).toEqual(4);
        });
        it('should not return ".svn" directories', function() {
            var plugins = path.join(temp, 'plugins');
            var android = path.join(plugins, 'android');
            var ios = path.join(plugins, 'ios');
            var svn = path.join(plugins, '.svn');
            shell.mkdir('-p', android);
            shell.mkdir('-p', ios);
            shell.mkdir('-p', svn);
            var res = util.findPlugins(plugins);
            expect(res.length).toEqual(2);
            expect(res.indexOf('.svn')).toEqual(-1);
        });
        it('should not return "CVS" directories', function() {
            var plugins = path.join(temp, 'plugins');
            var android = path.join(plugins, 'android');
            var ios = path.join(plugins, 'ios');
            var cvs = path.join(plugins, 'CVS');
            shell.mkdir('-p', android);
            shell.mkdir('-p', ios);
            shell.mkdir('-p', cvs);
            var res = util.findPlugins(plugins);
            expect(res.length).toEqual(2);
            expect(res.indexOf('CVS')).toEqual(-1);
        });
    });
});
