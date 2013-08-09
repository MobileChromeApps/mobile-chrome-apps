var wows = require('vows');
var assert = require('assert');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;


var doc = new DOMParser().parseFromString('<xml xmlns="http://test.com" id="root">' +
	'<child1 id="a1" title="1"><child11 id="a2"  title="2"/></child1>' +
	'<child2 id="a1"   title="3"/><child3 id="a1"   title="3"/></xml>','text/xml');

var doc1 = doc;
var str1=new XMLSerializer().serializeToString(doc);
var doc2 = doc1.cloneNode(true);
var doc3 = doc1.cloneNode(true);
var doc4 = doc1.cloneNode(true);

doc3.documentElement.appendChild(doc3.documentElement.lastChild);
//doc4.documentElement.appendChild(doc4.documentElement.firstChild);

var str2=new XMLSerializer().serializeToString(doc2);
var str3=new XMLSerializer().serializeToString(doc3);
var str4=new XMLSerializer().serializeToString(doc4);
console.assert(str1 == str3,str3,str1);
//console.assert(str3 != str4 && str3.length == str4.length,str3);
