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
var et = require('elementtree'),
    fs = require('fs');

function config_parser(path) {
    this.path = path;
    this.doc = new et.ElementTree(et.XML(fs.readFileSync(path, 'utf-8')));
    this.access = new access(this);
    this.preference = new preference(this);
}

config_parser.prototype = {
    packageName:function(id) {
        if (id) {
            this.doc.getroot().attrib.id = id;
            this.update();
        } else return this.doc.getroot().attrib.id;
    },
    name:function(name) {
        if (name) {
            this.doc.find('name').text = name;
            this.update();
        } else return this.doc.find('name').text;
    },
    version:function(version) {
        if (version) {
            this.doc.getroot().attrib.version = version;
            this.update();
        } else return this.doc.getroot().attrib.version;
    },
    update:function() {
        fs.writeFileSync(this.path, this.doc.write({indent: 4}), 'utf-8');
    }
};

function access(cfg) {
    this.config = cfg;
};

access.prototype = {
    add:function(uri) {
        var el = new et.Element('access');
        el.attrib.origin = uri;
        this.config.doc.getroot().append(el);
        this.config.update();
    },
    remove:function(uri) {
        var self = this;
        var els = [];
        if (uri) els = this.config.doc.findall('access[@origin="' + uri + '"]');
        else els = this.config.doc.findall('access');
        els.forEach(function(a) {
            self.config.doc.getroot().remove(0, a);
        });
        this.config.update();
    },
    get:function() {
        return this.config.doc.findall('access').map(function(a) { return a.attrib.origin || a.attrib.uri; });
    }
};

function preference(cfg) {
    this.config = cfg;
};

preference.prototype = {
    add:function(pref) {
        var el = new et.Element('preference');
        el.attrib.name = pref.name;
        el.attrib.value = pref.value;
        this.config.doc.getroot().append(el);
        this.config.update();
    },
    remove:function(name) {
        var self = this;
        var els = [];
        if (name) els = this.config.doc.findall('preference[@name="' + name + '"]');
        else els = this.config.doc.findall('preference');
        els.forEach(function(a) {
            self.config.doc.getroot().remove(0, a);
        });
        this.config.update();
    },
    get:function() {
        return this.config.doc.findall('preference').map(function(a) {
            return {
                name:a.attrib.name,
                value:a.attrib.value
            };
        });
    }
};

module.exports = config_parser;
