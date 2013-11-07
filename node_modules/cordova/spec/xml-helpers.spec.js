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

var path = require('path')
  , xml_helpers = require('../src/xml-helpers')
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


describe('xml-helpers', function(){
    describe('parseElementtreeSync', function() {
        it('should parse xml with a byte order mark', function() {
            var xml_path = path.join(__dirname, 'fixtures', 'projects', 'windows', 'bom_test.xml');
            expect(function() {
                xml_helpers.parseElementtreeSync(xml_path);
            }).not.toThrow();
        })
    });
    describe('equalNodes', function() {
        it('should return false for different tags', function(){
            expect(xml_helpers.equalNodes(usesNetworkOne, title)).toBe(false);
        });

        it('should return true for identical tags', function(){
            expect(xml_helpers.equalNodes(usesNetworkOne, usesNetworkTwo)).toBe(true);
        });   
        
        it('should return false for different attributes', function(){
            expect(xml_helpers.equalNodes(usesNetworkOne, usesReceive)).toBe(false);
        });  
        
        it('should distinguish between text', function(){
            expect(xml_helpers.equalNodes(helloTagOne, goodbyeTag)).toBe(false);
        });  
        
        it('should ignore whitespace in text', function(){
            expect(xml_helpers.equalNodes(helloTagOne, helloTagTwo)).toBe(true);
        });    
        
        describe('should compare children', function(){
            it('by child quantity', function(){
                var one = et.XML('<i><b>o</b></i>'),
                    two = et.XML('<i><b>o</b><u></u></i>');
        
                expect(xml_helpers.equalNodes(one, two)).toBe(false);        
            });
            
            it('by child equality', function(){
                var one = et.XML('<i><b>o</b></i>'),
                    two = et.XML('<i><u></u></i>'),
                    uno = et.XML('<i>\n<b>o</b>\n</i>');
        
                expect(xml_helpers.equalNodes(one, uno)).toBe(true); 
                expect(xml_helpers.equalNodes(one, two)).toBe(false);       
            });
        }); 
    });
    describe('pruneXML', function() {
        var config_xml;

        beforeEach(function() {
            config_xml = xml_helpers.parseElementtreeSync(path.join(__dirname, 'fixtures', 'projects', 'android', 'res', 'xml', 'config.xml'));
        });

        it('should remove any children that match the specified selector', function() {
            var children = config_xml.findall('plugins/plugin');
            xml_helpers.pruneXML(config_xml, children, 'plugins');
            expect(config_xml.find('plugins').getchildren().length).toEqual(0);
        });
        it('should do nothing if the children cannot be found', function() {
            var children = [title];
            xml_helpers.pruneXML(config_xml, children, 'plugins');
            expect(config_xml.find('plugins').getchildren().length).toEqual(17);
        });
        it('should be able to handle absolute selectors', function() {
            var children = config_xml.findall('plugins/plugin');
            xml_helpers.pruneXML(config_xml, children, '/cordova/plugins');
            expect(config_xml.find('plugins').getchildren().length).toEqual(0);
        });
        it('should be able to handle absolute selectors with wildcards', function() {
            var children = config_xml.findall('plugins/plugin');
            xml_helpers.pruneXML(config_xml, children, '/*/plugins');
            expect(config_xml.find('plugins').getchildren().length).toEqual(0);
        });
    });

    describe('graftXML', function() {
        var config_xml, plugin_xml;

        beforeEach(function() {
            config_xml = xml_helpers.parseElementtreeSync(path.join(__dirname, 'fixtures', 'projects', 'android', 'res', 'xml', 'config.xml'));
            plugin_xml = xml_helpers.parseElementtreeSync(path.join(__dirname, 'fixtures', 'plugins', 'ChildBrowser', 'plugin.xml'));
        });

        it('should add children to the specified selector', function() {
            var children = plugin_xml.find('config-file').getchildren();
            xml_helpers.graftXML(config_xml, children, 'plugins');
            expect(config_xml.find('plugins').getchildren().length).toEqual(19);
        });
        it('should be able to handle absolute selectors', function() {
            var children = plugin_xml.find('config-file').getchildren();
            xml_helpers.graftXML(config_xml, children, '/cordova');
            expect(config_xml.findall('access').length).toEqual(3);
        });
        it('should be able to handle absolute selectors with wildcards', function() {
            var children = plugin_xml.find('config-file').getchildren();
            xml_helpers.graftXML(config_xml, children, '/*');
            expect(config_xml.findall('access').length).toEqual(3);
        });
    });
});
