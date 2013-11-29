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

var path = require('path')
  , xml_helpers = require(path.join(__dirname, '..', 'util', 'xml-helpers'))
  , et = require('elementtree')

  , title = et.XML('<title>HELLO</title>')
  , usesNetworkOne = et.XML('<uses-permission ' +
			'android:name="PACKAGE_NAME.permission.C2D_MESSAGE"/>')
  , usesNetworkTwo = et.XML("<uses-permission android:name=\
            \"PACKAGE_NAME.permission.C2D_MESSAGE\" />")
  , usesReceive = et.XML("<uses-permission android:name=\
            \"com.google.android.c2dm.permission.RECEIVE\"/>")
  , helloTagOne = et.XML("<h1>HELLO</h1>")
  , goodbyeTag = et.XML("<h1>GOODBYE</h1>")
  , helloTagTwo = et.XML("<h1>  HELLO  </h1>");

exports['should return false for different tags'] = function (test) {
    test.ok(!xml_helpers.equalNodes(usesNetworkOne, title));
    test.done();
}

exports['should return true for identical tags'] = function (test) {
    test.ok(xml_helpers.equalNodes(usesNetworkOne, usesNetworkTwo));
    test.done();
}

exports['should return false for different attributes'] = function (test) {
    test.ok(!xml_helpers.equalNodes(usesNetworkOne, usesReceive));
    test.done();
}

exports['should distinguish between text'] = function (test) {
    test.ok(!xml_helpers.equalNodes(helloTagOne, goodbyeTag));
    test.done();
}

exports['should ignore whitespace in text'] = function (test) {
    test.ok(xml_helpers.equalNodes(helloTagOne, helloTagTwo));
    test.done();
}

exports['should compare children'] = {
    'by child quantity': function (test) {
        var one = et.XML('<i><b>o</b></i>'),
            two = et.XML('<i><b>o</b><u></u></i>');

        test.ok(!xml_helpers.equalNodes(one, two));
        test.done();
    },
    'by child equality': function (test) {
        var one = et.XML('<i><b>o</b></i>'),
            two = et.XML('<i><u></u></i>'),
            uno = et.XML('<i>\n<b>o</b>\n</i>');

        test.ok(xml_helpers.equalNodes(one, uno));
        test.ok(!xml_helpers.equalNodes(one, two));
        test.done();
    }
}
