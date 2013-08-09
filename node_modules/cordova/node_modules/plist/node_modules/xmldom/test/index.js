var XMLSerializer = require('xmldom').XMLSerializer;
var DOMParser = require('xmldom').DOMParser;
try{
	var libxml = require('libxmljs');
}catch(e){
	var DomJS = require("dom-js");
}

var assert = require('assert');
var oldParser = DOMParser.prototype.parseFromString ;
function format(s){
	if(libxml){
		var result = libxml.parseXmlString(s).toString().replace(/^\s+|\s+$/g,'');
		//console.log(result.charCodeAt().toString(16),result)
	}else{
		var domjs = new DomJS.DomJS();
		domjs.parse(s, function(err, dom) {
	  	  result = dom.toXml();
		});
	}
	return result;
}
function check(data,doc){
	var domjsresult = format(data);
	var xmldomresult = new XMLSerializer().serializeToString(doc);
	var xmldomresult2 = new XMLSerializer().serializeToString(doc.cloneNode(true));
	assert.equal(xmldomresult,xmldomresult2);
	xmldomresult = xmldomresult.replace(/^<\?.*?\?>\s*|<!\[CDATA\[\]\]>/g,'')
	domjsresult = domjsresult.replace(/^<\?.*?\?>\s*|<!\[CDATA\[\]\]>/g,'')
	//console.log('['+xmldomresult+'],['+domjsresult+']')
	if(xmldomresult!=domjsresult){
		assert.equal(format(xmldomresult),domjsresult);
	}
	
}
DOMParser.prototype.parseFromString = function(data,mimeType){
	var doc = oldParser.apply(this,arguments);
	function ck(){
		if(!/\/x?html?\b/.test(mimeType)){
			try{
			check(data,doc);
			}catch(e){console.dir(e)}
		}
	}
	if(this.options.checkLater){
	setTimeout(ck,1);
	}else{ck()}
	return doc;
}
function include(){
	for(var i=0;i<arguments.length;i++){
		var file = arguments[i]
		console.log('test ',file);
		require(file);
	}
}
include('./dom','./parse-element','./node','./namespace','./html/normalize'
		,'./error','./locator'
		,'./big-file-performance'
		)



