var wows = require('vows');
var assert = require('assert');
var XMLSerializer = require('xmldom').XMLSerializer;
var DOMParser = require('xmldom').DOMParser;
var DomJS = require("dom-js").DomJS;
try{
	var Libxml = require('libxmljs');
}catch(e){
}

function xmldom(data){
	console.time('xmldom');
	var doc = new DOMParser({locator:null,checkLater:true}).parseFromString(data);
	console.timeEnd('xmldom');
	doc.toString = function(){
		return new XMLSerializer().serializeToString(doc);
	}
	return doc;
}
function libxml(data){
	if(Libxml){
		console.time('libxml');
		var doc = Libxml.parseXmlString(data);
		console.timeEnd('libxml');
		var ToString=doc.toString ;
		doc.toString = function(){
			return ToString.apply(this,arguments).replace(/^\s+|\s+$/g,'');
		}
		return doc;
	}else{
		console.warn('libxml is not installed')
	}
}

function domjs(data){
	console.time('dom-js');
	var doc;
	new DomJS().parse(data, function(err, dom) {
	    doc = dom;
	});
	console.timeEnd('dom-js');
	
	doc.toString = function(){
		return doc.toXml();
	}
	return doc
}
var maxRandomAttr =parseInt(Math.random()*60);
console.log('maxRandomAttr',maxRandomAttr)
function addAttributes(el){
	var c =parseInt(Math.random()*maxRandomAttr);
	while(c--){
		el.setAttribute('dynamic-attr'+c,c+new Array(c).join('.'));
	}
	var child = el.firstChild;
	while(child){
		if(child.nodeType == 1){
			addAttributes(child)
		}else if(child.nodeType == 4){//cdata
			el.insertBefore(el.ownerDocument.createTextNode(child.data),child);
			el.removeChild(child);
		}
		child = child.nextSibling;
	}
}
// Create a Test Suite
wows.describe('XML Node Parse').addBatch({
    "big file parse":function(){
		var fs = require('fs');
		var path = require('path')
		var data = fs.readFileSync(path.resolve(__dirname,'./test.xml'), 'ascii');
		//data = "<?xml version=\"1.0\"?><xml><child> ![CDATA[v]] d &amp;</child>\n</xml>"
		console.log('test simple xml')
		var t1 = new Date();
		var doc1 = xmldom(data);
		var t2 = new Date();
		var doc2 = domjs(data);
		var t3 = new Date();
		var doc3 = libxml(data);
		var t4 = new Date();
		var xmldomTime = t2-t1;
		var domjsTime = t3-t2;
		console.assert(domjsTime>xmldomTime,'xmldom performance must more height!!')
		
		
		doc1 = doc1.cloneNode(true);
		addAttributes(doc1.documentElement);
		
		data = doc1.toString();
		console.log('test more attribute xml')
		var t1 = new Date();
		var doc1 = xmldom(data);
		var t2 = new Date();
		var doc2 = domjs(data);
		var t3 = new Date();
		var doc3 = libxml(data);
		var t4 = new Date();
		var xmldomTime = t2-t1;
		var domjsTime = t3-t2;
		console.assert(domjsTime>xmldomTime,'xmldom performance must more height!!')
		function xmlReplace(a,v){
			switch(v){
			case '&':
			return '&amp;'
			case '<':
			return '&lt;'
			default:
			if(v.length>1){
				return v.replace(/([&<])/g,xmlReplace)
			}
			}
		}
		xmldomresult = (domjs(doc1+'')+'').replace(/^<\?.*?\?>\s*|<!\[CDATA\[([\s\S]*?)\]\]>/g,xmlReplace)
		domjsresult = (doc2+'').replace(/^<\?.*?\?>\s*|<!\[CDATA\[([\s\S]*?)\]\]>/g,xmlReplace)
		data = xmldomresult;
		//console.log(data.substring(100,200))
		
		console.log('test more attribute xml without cdata')
		var t1 = new Date();
		var doc1 = xmldom(data);
		var t2 = new Date();
		var doc2 = domjs(data);
		var t3 = new Date();
		var doc3 = libxml(data);
		var t4 = new Date();
		var xmldomTime = t2-t1;
		var domjsTime = t3-t2;
		console.assert(domjsTime>xmldomTime,'xmldom performance must more height!!')
		
		//console.log(xmldomresult,domjsresult)
		
		//assert.equal(xmldomresult,domjsresult);
		//,xmldomresult,domjsresult)
		if(xmldomresult !== domjsresult){
			for(var i=0;i<xmldomresult.length;i++){
				if(xmldomresult.charAt(i)!=domjsresult.charAt(i)){
					console.log(xmldomresult.charAt(i))
					var begin = i-50;
					var len = 100;
					xmldomresult = xmldomresult.substr(begin,len)
					domjsresult = domjsresult.substr(begin,len)
					//console.log(xmldomresult.length,domjsresult.length)
					console.log('pos'+i,'\n',xmldomresult,'\n\n\n\n',domjsresult)
					console.assert(xmldomresult == domjsresult)
					break;
				}
			} 
			
		}
		//console.assert(xmldomresult == domjsresult,xmldomresult.length,i)
    }
}).run(); // Run it
