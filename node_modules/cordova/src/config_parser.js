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
    xml= require('./xml-helpers'),
    fs = require('fs');

function config_parser(path) {
    this.path = path;
    try {
        this.doc = xml.parseElementtreeSync(path);
    } catch (e) {
        throw new Error("Parsing "+path+" failed:\n"+e.message);
    }
    var r = this.doc.getroot();
    var xmlns ='http://www.w3.org/ns/widgets';
    if((r.tag !== 'widget') || !r.attrib || (r.attrib.xmlns !== xmlns)) {
        throw new Error("This file does not seem to be a cordova config.xml file: " + path);
    }
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
    content: function(src) {
        var content = this.doc.find('content');
        if (src) {
            content = content || new et.Element('content');
            content.attrib.src = src;
            this.update();
        } else {
            if (!content) {
                content = new et.Element('content');
                content.attrib.src = 'index.html';
                this.doc.getroot().append(content);
                this.update();
            }
            return content.attrib.src;
        }
    },
    author: function (name) {
        if (name) {
            var author = this.doc.find('author');
            if (!author) {
                author = new et.Element('author');
                this.doc.getroot().append(author);
            }

            author.text = name;
            this.update();
        }
        else {
            var author = this.doc.find('author');
            return author ? author.text.trim() : '';
        }
    },
    update:function() {
        fs.writeFileSync(this.path, this.doc.write({indent: 4}), 'utf-8');
    },
    merge_with: function (cfg, platform, clobber) {
        var BLACKLIST = ["platform"],
            SINGLETONS = ["content", "author"];
        mergeXml(cfg.doc.getroot(), this.doc.getroot(), platform, clobber);
        this.update();

        function mergeXml(src, dest, platform, clobber) {
            if (BLACKLIST.indexOf(src.tag) === -1) {
                //Handle attributes
                Object.getOwnPropertyNames(src.attrib).forEach(function (attribute) {
                    if (clobber || !dest.attrib[attribute]) {
                        dest.attrib[attribute] = src.attrib[attribute];
                    }
                });
                //Handle text
                if (src.text && (clobber || !dest.text)) {
                    dest.text = src.text;
                }
                //Handle platform
                if (platform) {
                    src.findall('platform[@name="' + platform + '"]').forEach(function (platformElement) {
                        platformElement.getchildren().forEach(mergeChild);
                    });
                }

                //Handle children
                src.getchildren().forEach(mergeChild);

                function mergeChild (srcChild) {
                    var srcTag = srcChild.tag,
                        destChild = new et.Element(srcTag),
                        foundChild,
                        query = srcTag + "",
                        shouldMerge = true;

                    if (BLACKLIST.indexOf(srcTag) === -1) {
                        if (SINGLETONS.indexOf(srcTag) !== -1) {
                            foundChild = dest.find(query);
                            if (foundChild) {
                                destChild = foundChild;
                                dest.remove(0, destChild);
                            }
                        } else {
                            //Check for an exact match and if you find one don't add
                            Object.getOwnPropertyNames(srcChild.attrib).forEach(function (attribute) {
                                query += "[@" + attribute + '="' + srcChild.attrib[attribute] + '"]';
                            });
                            foundChild = dest.find(query);
                            if (foundChild && textMatch(srcChild, foundChild)) {
                                destChild = foundChild;
                                dest.remove(0, destChild);
                                shouldMerge = false;
                            }
                        }

                        mergeXml(srcChild, destChild, platform, clobber && shouldMerge);
                        dest.append(destChild);
                    }
                }

                function textMatch(elm1, elm2) {
                    var text1 = elm1.text ? elm1.text.replace(/\s+/, "") : "",
                        text2 = elm2.text ? elm2.text.replace(/\s+/, "") : "";
                    return (text1 === "" || text1 === text2);
                }
            }
        }
    }
};

function access(cfg) {
    this.config = cfg;
};

access.prototype = {
    add:function(uri, subdomain) {
        var el = new et.Element('access');
        el.attrib.origin = uri;
        if (typeof subdomain !== "undefined") el.attrib.subdomains = subdomain;
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
    },
    getAttributes:function() {
        return this.config.doc.findall('access').map(function(a) { return a.attrib; });
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
