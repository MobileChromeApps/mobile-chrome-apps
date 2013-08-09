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

/**
 * contains XML utility functions, some of which are specific to elementtree
 */

var fs = require('fs')
  , path = require('path')
  , et = require('elementtree');

module.exports = {
    moveProjFile: function(origFile, projPath, callback) {
        var src = path.resolve(projPath, origFile)
          , dest = src.replace('.orig', '');

        fs.createReadStream(src)
            .pipe(fs.createWriteStream(dest))
            .on('close', callback);
    },

    // compare two et.XML nodes, see if they match
    // compares tagName, text, attributes and children (recursively)
    equalNodes: function(one, two) {
        if (one.tag != two.tag) {
            return false;
        } else if (one.text.trim() != two.text.trim()) {
            return false;
        } else if (one._children.length != two._children.length) {
            return false;
        }

        var oneAttribKeys = Object.keys(one.attrib),
            twoAttribKeys = Object.keys(two.attrib),
            i = 0, attribName;

        if (oneAttribKeys.length != twoAttribKeys.length) {
            return false;
        }

        for (i; i < oneAttribKeys.length; i++) {
            attribName = oneAttribKeys[i];

            if (one.attrib[attribName] != two.attrib[attribName]) {
                return false;
            }
        }

        for (i; i < one._children.length; i++) {
            if (!module.exports.equalNodes(one._children[i], two._children[i])) {
                return false;
            }
        }

        return true;
    },

    // adds node to doc at selector
    graftXML: function(doc, nodes, selector) {
        var parent = resolveParent(doc, selector);
        if (!parent) return false;

        nodes.forEach(function (node) {
            // check if child is unique first
            if (uniqueChild(node, parent)) {
                parent.append(node);
            }
        });

        return true;
    },

    // removes node from doc at selector
    pruneXML: function(doc, nodes, selector) {
        var parent = resolveParent(doc, selector);
        if (!parent) return false;

        nodes.forEach(function (node) {
            var matchingKid = null;
            if ((matchingKid = findChild(node, parent)) != null) {
                // stupid elementtree takes an index argument it doesn't use
                // and does not conform to the python lib
                parent.remove(0, matchingKid);
            }
        });

        return true;
    },

    parseElementtreeSync: function (filename) {
        var contents = fs.readFileSync(filename, 'utf-8').replace("\ufeff", "");;
        return new et.ElementTree(et.XML(contents));
    }
};

function findChild(node, parent) {
    var matchingKids = parent.findall(node.tag)
      , i, j;

    for (i = 0, j = matchingKids.length ; i < j ; i++) {
        if (module.exports.equalNodes(node, matchingKids[i])) {
            return matchingKids[i];
        }
    }
    return null;
}

function uniqueChild(node, parent) {
    var matchingKids = parent.findall(node.tag)
      , i = 0;

    if (matchingKids.length == 0) {
        return true;
    } else  {
        for (i; i < matchingKids.length; i++) {
            if (module.exports.equalNodes(node, matchingKids[i])) {
                return false;
            }
        }
        return true;
    }
}

var ROOT = /^\/([^\/]*)/,
    ABSOLUTE = /^\/([^\/]*)\/(.*)/;
function resolveParent(doc, selector) {
    var parent, tagName, subSelector;

    // handle absolute selector (which elementtree doesn't like)
    if (ROOT.test(selector)) {
        tagName = selector.match(ROOT)[1];
        // test for wildcard "any-tag" root selector
        if (tagName == '*' || tagName === doc._root.tag) {
            parent = doc._root;

            // could be an absolute path, but not selecting the root
            if (ABSOLUTE.test(selector)) {
                subSelector = selector.match(ABSOLUTE)[2];
                parent = parent.find(subSelector)
            }
        } else {
            return false;
        }
    } else {
        parent = doc.find(selector)
    }
    return parent;
}
