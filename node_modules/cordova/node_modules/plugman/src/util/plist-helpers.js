/*
 *
 * Copyright 2013 Brett Rudd
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

// contains PLIST utility functions

var et = require('elementtree'),
    plist = require('plist');
 
// adds node to doc at selector
module.exports = {
    graftPLIST:function (doc, xml, selector) {
        var obj = plist.parseStringSync("<plist>"+xml+"</plist>");

        var node = doc[selector];
        if (node && Array.isArray(node) && Array.isArray(obj))
            doc[selector] = node.concat(obj);
        else
            doc[selector] = obj;

        return true;
    },
    // removes node from doc at selector
    prunePLIST:function(doc, xml, selector) {
        var obj = plist.parseStringSync("<plist>"+xml+"</plist>");
            
        pruneOBJECT(doc, selector, obj);

        return true;
    }
}

function pruneOBJECT(doc, selector, fragment) {
    if (Array.isArray(fragment) && Array.isArray(doc[selector])) {
        var empty = true;
        for (i in fragment) {
            for (j in doc[selector]) {
                empty = pruneOBJECT(doc[selector], j, fragment[i]) && empty;
            }  
        }
        if (empty) 
        {
            delete doc[selector];
            return true;
        }
    }
    else if (nodeEqual(doc[selector], fragment)) {
        delete doc[selector];
        return true;
    }
    
    return false;
}

function nodeEqual(node1, node2) {
    if (typeof node1 != typeof node2)
        return false;
    else if (typeof node1 == 'string') {
        node2 = escapeRE(node2).replace(new RegExp("\\$[a-zA-Z0-9-_]+","gm"),"(.*?)");
        return new RegExp('^' + node2 + '$').test(node1);
    }
    else {
        for (var key in node2) {
            if (!nodeEqual(node1[key], node2[key])) return false;
        }
        return true;
    }
}

// escape string for use in regex
function escapeRE(str) {
     return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\$&");
};
