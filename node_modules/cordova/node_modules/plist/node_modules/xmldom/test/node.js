var wows = require('vows');
var assert = require('assert');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var parser = new DOMParser();
// Create a Test Suite
wows.describe('XML Node Parse').addBatch({
    'element': function () { 
    	var dom = new DOMParser().parseFromString('<xml><child/></xml>');
    	console.assert (dom.childNodes.length== 1,dom.childNodes.length, 1);
    	console.assert (dom.documentElement.childNodes.length== 1);
    	console.assert (dom.documentElement.tagName== 'xml');
    	console.assert (dom.documentElement.firstChild.tagName== 'child');
    },
    'text':function(){
    	var dom = new DOMParser().parseFromString('<xml>start center end</xml>');
    	var root = dom.documentElement;
    	console.assert( root.firstChild.data =='start center end');
    	console.assert( root.firstChild.nextSibling ==null);
    },
    'cdata': function () {
    	var dom = new DOMParser().parseFromString('<xml>start <![CDATA[<encoded>]]> end<![CDATA[[[[[[[[[]]]]]]]]]]></xml>');
    	var root = dom.documentElement;
    	console.assert ( root.firstChild.data =='start ');
    	console.assert ( root.firstChild.nextSibling.data =='<encoded>');
    	console.assert ( root.firstChild.nextSibling.nextSibling.nextSibling.data =='[[[[[[[[]]]]]]]]');
    },
    'cdata empty': function () {
    	var dom = new DOMParser().parseFromString('<xml><![CDATA[]]>start <![CDATA[]]> end</xml>');
    	var root = dom.documentElement;
    	console.assert ( root.textContent =='start  end');
    },
    'comment': function(){
    	var dom = new DOMParser().parseFromString('<xml><!-- comment&>< --></xml>');
    	var root = dom.documentElement;
    	console.assert ( root.firstChild.nodeValue ==' comment&>< ');
    },
    'cdata comment': function(){
    	var dom = new DOMParser().parseFromString('<xml>start <![CDATA[<encoded>]]> <!-- comment -->end</xml>');
    	var root = dom.documentElement;
    	console.assert ( root.firstChild.nodeValue =='start ');
    	console.assert ( root.firstChild.nextSibling.nodeValue =='<encoded>');
    	console.assert ( root.firstChild.nextSibling.nextSibling.nextSibling.nodeValue ==' comment ');
    	console.assert ( root.firstChild.nextSibling.nextSibling.nextSibling.nextSibling.nodeValue =='end');
    },
    'append node': function () {
    	var dom = new DOMParser().parseFromString('<xml/>');
    	var child = dom.createElement("child");
    	console.assert ( child == dom.documentElement.appendChild(child));
    	console.assert ( child == dom.documentElement.firstChild);
    	var fragment = new dom.createDocumentFragment();
    	console.assert ( child == fragment.appendChild(child));
    },
    'insert node': function () {
    	var dom = new DOMParser().parseFromString('<xml><child/></xml>');
    	var node = dom.createElement("sibling");
    	var child = dom.documentElement.firstChild;
    	child.parentNode.insertBefore(node, child);
    	console.assert ( node == child.previousSibling);
    	console.assert ( node.nextSibling == child);
    	console.assert ( node.parentNode == child.parentNode);
    },
    'insert fragment': function () {
    	var dom = new DOMParser().parseFromString('<xml><child/></xml>');
    	var fragment = dom.createDocumentFragment();
    	assert(fragment.nodeType === 11);
    	var first = fragment.appendChild(dom.createElement("first"));
    	var last = fragment.appendChild(dom.createElement("last"));
    	console.assert ( fragment.firstChild == first);
    	console.assert ( fragment.lastChild == last);
    	console.assert ( last.previousSibling == first);
    	console.assert ( first.nextSibling == last);
    	var child = dom.documentElement.firstChild;
    	child.parentNode.insertBefore(fragment, child);
    	console.assert ( last.previousSibling == first);
    	console.assert ( first.nextSibling == last);
    	console.assert ( child.parentNode.firstChild == first);
    	console.assert ( last == child.previousSibling);
    	console.assert ( last.nextSibling == child);
    	console.assert ( first.parentNode == child.parentNode);
    	console.assert ( last.parentNode == child.parentNode);
    }
}).addBatch({
	"instruction":function(){
		var source = '<?xml version="1.0"?><root><child>&amp;<!-- &amp; --></child></root>';
		var doc = new DOMParser().parseFromString(source,"text/xml");
    	var source2 = new XMLSerializer().serializeToString(doc);
    	console.assert(source == source2,source2);
	}
}).run(); // Run it
//var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
//var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
//var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
//var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
//var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
//var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
//var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
//var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
//var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
//var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
//var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
//var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;
