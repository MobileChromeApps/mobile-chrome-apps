var wows = require('vows');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
// Create a Test Suite
wows.describe('XML Namespace Parse').addBatch({
    // See: http://jsfiddle.net/bigeasy/ShcXP/1/
    "Document_getElementsByTagName":function () {
    	var doc = new DOMParser().parseFromString('<a><b/></a>');
    	console.assert(doc.getElementsByTagName('*').length == 2);
    	console.assert(doc.documentElement.getElementsByTagName('*').length == 1);
    },
    'getElementsByTagName': function () { 
    	

       var doc = new DOMParser().parseFromString('<xml xmlns="http://test.com" xmlns:t="http://test.com" xmlns:t2="http://test2.com">' +
       		'<t:test/><test/><t2:test/>'+
       		'<child attr="1"><test><child attr="2"/></test></child>' +
       		'<child attr="3"/></xml>','text/xml');
       var childs = doc.documentElement.getElementsByTagName('child');
       console.assert(childs.item(0).getAttribute('attr')=="1",childs.item(0)+'');
       console.assert(childs.item(1).getAttribute('attr')=="2",childs.item(1)+'');
       console.assert(childs.item(2).getAttribute('attr')=="3",childs.item(2)+'');
       console.assert(childs.length==3,3,childs.length);
       
       var childs = doc.getElementsByTagName('child');
       console.assert(childs.item(0).getAttribute('attr')=="1",childs.item(0)+'');
       console.assert(childs.item(1).getAttribute('attr')=="2",childs.item(1)+'');
       console.assert(childs.item(2).getAttribute('attr')=="3",childs.item(2)+'');
       console.assert(childs.length==3,3,childs.length);
       
       
       
       
       
       var childs = doc.documentElement.getElementsByTagName('*');
       for(var i=0,buf = [];i<childs.length;i++){
       	buf.push(childs[i].tagName)
       }
       console.assert(childs.length==7,childs.length,buf);
       
       
       
       
		var feed = new DOMParser().parseFromString('<feed><entry>foo</entry></feed>');
		var entries = feed.documentElement.getElementsByTagName('entry');
		console.log(entries[0].nodeName);
       console.log(feed.documentElement.childNodes.item(0).nodeName);
    },
    'getElementsByTagNameNS': function () { 
       var doc = new DOMParser().parseFromString('<xml xmlns="http://test.com" xmlns:t="http://test.com" xmlns:t2="http://test2.com">' +
       		'<t:test/><test/><t2:test/>'+
       		'<child attr="1"><test><child attr="2"/></test></child>' +
       		'<child attr="3"/></xml>','text/xml');
       		
       var childs = doc.documentElement.getElementsByTagNameNS("http://test.com",'*');
       console.assert(childs.length==6,childs.length);
       
        var childs = doc.getElementsByTagNameNS("http://test.com",'*');
       console.assert(childs.length==7,childs.length);
       
       
       var childs = doc.documentElement.getElementsByTagNameNS("http://test.com",'test');
       console.assert(childs.length==3,childs.length);
       
       var childs = doc.getElementsByTagNameNS("http://test.com",'test');
       console.assert(childs.length==3,childs.length);
       
       
       
    },
    'getElementById': function () { 
       var doc = new DOMParser().parseFromString('<xml xmlns="http://test.com" id="root">' +
       		'<child id="a1" title="1"><child id="a2"  title="2"/></child>' +
       		'<child id="a1"   title="3"/></xml>','text/xml');
       console.assert(doc.getElementById('root'))
       console.assert(doc.getElementById('a1').getAttribute('title')=="1",doc.getElementById('a1'));
       console.assert(doc.getElementById('a2').getAttribute('title')=="2",doc.getElementById('a2'));
       console.assert(doc.getElementById('a2').getAttribute('title2')=="",doc.getElementById('a2'));
    },
    "append exist child":function(){
       var doc = new DOMParser().parseFromString('<xml xmlns="http://test.com" id="root">' +
       		'<child1 id="a1" title="1"><child11 id="a2"  title="2"/></child1>' +
       		'<child2 id="a1"   title="3"/><child3 id="a1"   title="3"/></xml>','text/xml');
       	
       	var doc1 = doc;
       	var str1=new XMLSerializer().serializeToString(doc);
       	var doc2 = doc1.cloneNode(true);
       	var doc3 = doc1.cloneNode(true);
       	var doc4 = doc1.cloneNode(true);
       	
       	doc3.documentElement.appendChild(doc3.documentElement.lastChild);
       	doc4.documentElement.appendChild(doc4.documentElement.firstChild);
       	
       	var str2=new XMLSerializer().serializeToString(doc2);
       	var str3=new XMLSerializer().serializeToString(doc3);
       	var str4=new XMLSerializer().serializeToString(doc4);
       	console.assert(str1 == str2 && str2 == str3,str3,str1);
       	console.assert(str3 != str4 && str3.length == str4.length,str3);
       	
    },
    "append exist other child":function(){
    	var doc = new DOMParser().parseFromString('<xml xmlns="http://test.com" id="root">' +
       		'<child1 id="a1" title="1"><child11 id="a2"  title="2"><child/></child11></child1>' +
       		'<child2 id="a1"   title="3"/><child3 id="a1"   title="3"/></xml>','text/xml');
       	
       	var doc1 = doc;
       	var str1=new XMLSerializer().serializeToString(doc);
       	var doc2 = doc1.cloneNode(true);
       	
       	console.assert(doc2.documentElement.lastChild.childNodes.length == 0);
       	doc2.documentElement.appendChild(doc2.documentElement.firstChild.firstChild);
       	
       	var str2=new XMLSerializer().serializeToString(doc2);
       	
       	console.assert(doc2.documentElement.lastChild.childNodes.length == 1);
       	console.assert(str1 != str2 && str1.length != str2.length,str3);
       	var doc3 = new DOMParser().parseFromString(str2,'text/xml');
       	doc3.documentElement.firstChild.appendChild(doc3.documentElement.lastChild);
       	var str3 = new XMLSerializer().serializeToString(doc3);
       	console.assert(str1 == str3);
    },
    "set textContent":function() {
        var doc = new DOMParser().parseFromString('<test><a/><b><c/></b></test>');
        var a = doc.documentElement.firstChild;
        var b = a.nextSibling;
        a.textContent = 'hello';
        console.assert(doc.documentElement.toString() == '<test><a>hello</a><b><c/></b></test>');
        b.textContent = 'there';
        console.assert(doc.documentElement.toString() == '<test><a>hello</a><b>there</b></test>');
        b.textContent = '';
        console.assert(doc.documentElement.toString() == '<test><a>hello</a><b/></test>');
        doc.documentElement.textContent = 'bye';
        console.assert(doc.documentElement.toString() == '<test>bye</test>');
    },
    "nested append failed":function(){
    },
    "self append failed":function(){
    }
}).run(); // Run it
