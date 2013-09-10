var wows = require('vows');
var DOMParser = require('xmldom').DOMParser;


wows.describe('errorHandle').addBatch({
  'only function two args': function() {
  	var error = {}
    var parser = new DOMParser({
    	errorHandler:function(key,msg){error[key] = msg}
	});
	try{
    	var doc = parser.parseFromString('<html disabled><1 1="2"/></body></html>', 'text/xml');
		console.assert(error.warning!=null ,'error.error:'+error.warning);
		console.assert(error.error!=null ,'error.error:'+error.error);
		console.assert(error.fatalError!=null ,'error.error:'+error.fatalError);
		//console.log(doc+'')
	}catch(e){
	}
  },
  'only function': function() {
  	var error = []
    var parser = new DOMParser({
    	errorHandler:function(msg){error.push(msg)}
	});
	try{
    	var doc = parser.parseFromString('<html disabled><1 1="2"/></body></html>', 'text/xml');
    	error.map(function(e){error[e.replace(/\:[\s\S]*/,'')]=e})
		console.assert(error.warning!=null ,'error.error:'+error.warning);
		console.assert(error.error!=null ,'error.error:'+error.error);
		console.assert(error.fatalError!=null ,'error.error:'+error.fatalError);
		//console.log(doc+'')
	}catch(e){
	}
  },
  'only function': function() {
  	var error = []
  	var errorMap = []
    new DOMParser({
    	errorHandler:function(msg){error.push(msg)}
	}).parseFromString('<html><body title="1<2">test</body></html>', 'text/xml');
    'warn,warning,error,fatalError'.replace(/\w+/g,function(k){
    	var errorHandler = {};
    	errorMap[k] = [];
    	errorHandler[k] = function(msg){errorMap[k] .push(msg)}
	    new DOMParser({errorHandler:errorHandler}).parseFromString('<html><body title="1<2">test</body></html>', 'text/xml');
    });
    for(var n in errorMap){
    	console.assert(error.length == errorMap[n].length)
    }
  },
  'error function': function() {
  	var error = []
    var parser = new DOMParser({
    	locator:{},
    	errorHandler:{
			error:function(msg){
				error.push(msg);
				throw new Error(msg)
			}
		}
	});
	try{
    	var doc = parser.parseFromString('<html><body title="1<2"><table>&lt;;test</body></body></html>', 'text/html');
	}catch(e){
		console.log(e);
		console.assert(/\n@#\[line\:\d+,col\:\d+\]/.test(error.join(' ')),'line,col must record:'+error)
		return;
	}
	console.assert(false,doc+' should be null');
  }
}).run();