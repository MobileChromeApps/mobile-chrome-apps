var wows = require('vows');
var DOMParser = require('xmldom').DOMParser;

function assertPosition(n, line, col) {
  console.assert(n.lineNumber == line,'lineNumber:'+n.lineNumber+'/'+line);
  console.assert(n.columnNumber == col,'columnNumber:'+n.columnNumber+'/'+col);
}

wows.describe('DOMLocator').addBatch({
  'node positions': function() {
    var parser = new DOMParser({locator:{}});
    var doc = parser.parseFromString('<?xml version="1.0"?><!-- aaa -->\n<test>\n  <a attr="value"><![CDATA[1]]>something\n</a>x</test>', 'text/xml');
    var test = doc.documentElement;
    var a = test.firstChild.nextSibling;
    assertPosition(doc.firstChild, 1, 1);
    assertPosition(doc.firstChild.nextSibling, 1, 1+'<?xml version="1.0"?>'.length);
    assertPosition(test, 2, 1);
    //assertPosition(test.firstChild, 1, 7);
    assertPosition(a, 3, 3);
    assertPosition(a.firstChild, 3, 19);
    assertPosition(a.firstChild.nextSibling, 3, 19+'<![CDATA[1]]>'.length);
    assertPosition(test.lastChild, 4, 5);
  },
  'error positions':function(){
  	var error = []
    var parser = new DOMParser({
    	locator:{systemId:'c:/test/1.xml'},
    	errorHandler:function(msg){
			error.push(msg);
		}
	});
    var doc = parser.parseFromString('<html><body title="1<2"><table>&lt;;test</body></body></html>', 'text/html');
	console.assert(/\n@c\:\/test\/1\.xml#\[line\:\d+,col\:\d+\]/.test(error.join(' ')),'line,col must record:'+error)
  },
  'error positions p':function(){
  	var error = []
    var parser = new DOMParser({
    	locator:{},
    	errorHandler:function(msg){
			error.push(msg);
		}
	});
    var doc = parser.parseFromString('<root>\n\t<err</root>', 'text/html');
    var root = doc.documentElement;
    var textNode = root.firstChild;
	console.log(root+'/'+textNode)
	console.assert(/\n@#\[line\:2,col\:2\]/.test(error.join(' ')),'line,col must record:'+error);
	console.log(textNode.lineNumber+'/'+textNode.columnNumber)
  }
}).run();