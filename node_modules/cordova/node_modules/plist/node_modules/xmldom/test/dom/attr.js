var wows = require('vows');
var DOMParser = require('xmldom').DOMParser;

// Create a Test Suite
wows.describe('XML attrs').addBatch({
    "set attribute":function(){
    	var root = new DOMParser().parseFromString("<xml/>",'text/xml').documentElement;
    	root.setAttribute('a','1');
    	console.assert(root.attributes[0].localName == 'a');
    	root.setAttribute('b',2);
    	root.setAttribute('a',1);
    	root.setAttribute('a',1);
    	root.setAttribute('a',1);
    	console.assert(root.attributes.length == 2);
    	try {
    		var c = root.ownerDocument.createElement('c');
    		c.setAttributeNode(root.attributes.item(0));
    	} catch (e) {
    		console.assert(e.code == 10);
    		return;
    	}
    	console.assert(false);
    },
    "set ns attribute":function(){
    	var root = new DOMParser().parseFromString("<xml xmlns:a='a' xmlns:b='b' xmlns='e'><child/></xml>",'text/xml').documentElement;
    	var child = root.firstChild
    	child.setAttributeNS('a','a:a','1');
    	child.setAttributeNS('b','b:b','2');
    	child.setAttributeNS('b','b:a','1');
    	console.assert(child.attributes.length == 3,child.attributes.length,child+'');
    	child.setAttribute('a',1);
    	child.setAttributeNS('b','b:b','2');
    	console.assert(child.attributes.length == 4,child.attributes.length);
    	try {
    		var c = root.ownerDocument.createElement('c');
    		c.setAttributeNodeNS(root.attributes.item(0));
    	} catch (e) {
    		console.assert(e.code == 10);
    		return;
    	}
    	console.assert(false);
    },
    "override attribute":function(){
    	var root = new DOMParser().parseFromString("<xml xmlns:a='a' xmlns:b='b' xmlns='e'><child/></xml>",'text/xml').documentElement;
    	root.setAttributeNS('a','a:a','1');
    	console.assert(root.attributes.length == 4,root.attributes.length);
//not standart
//    	root.firstChild.setAttributeNode(root.attributes[0]);
//    	console.assert(root.attributes.length == 0);
    },
    "attribute namespace":function(){
    	var root = new DOMParser().parseFromString("<xml xmlns:a='a' xmlns:b='b' a:b='e'></xml>",'text/xml').documentElement;
    	console.assert(root.getAttributeNS("a", "b"), "e");
    },
    "override ns attribute":function(){
    	
    },
    "set existed attribute":function(){
    	
    },
    "set document existed attribute":function(){
    	
    }
}).run(); // Run it