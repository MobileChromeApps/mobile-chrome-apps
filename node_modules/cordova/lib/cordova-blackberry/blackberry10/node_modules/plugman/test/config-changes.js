/*
 *
 * Copyright 2013 Anis Kadri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var configChanges = require('../util/config-changes'),
    fs = require('fs'),
    et = require('elementtree'),
    xmlText = fs.readFileSync('test/dummy.xml', 'utf-8'),
    xmlDoc = new et.ElementTree(et.XML(xmlText)),
    platformTag = null;

exports.android = {
    setUp: function (callback) {
        platformTag = xmlDoc.find('./platform[@name="android"]');
        callback();
    },

    'should have the right number of fields': function (test) {
        var changes = configChanges(platformTag);

        test.equal(Object.keys(changes).length, 3);
        test.done();
    },

    'should have the right field names': function (test) {
        var changes = configChanges(platformTag);

        test.ok(changes['AndroidManifest.xml']);
        test.ok(changes['res/xml/plugins.xml']);
        test.ok(changes['res/xml/config.xml']);
        test.done();
    },

    'should have each field as an array': function (test) {
        var changes = configChanges(platformTag);

        test.equal(changes['AndroidManifest.xml'].length, 2);
        test.equal(changes['res/xml/plugins.xml'].length, 1);
        test.equal(changes['res/xml/config.xml'].length, 1);
        test.done();
    }
}
