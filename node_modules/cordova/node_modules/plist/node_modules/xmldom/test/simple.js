var wows = require('vows');
var DOMParser = require('xmldom').DOMParser;


wows.describe('errorHandle').addBatch({
  'simple': function() {
    var parser = new DOMParser();
	var doc = parser.parseFromString('<html><body title="1<2"></body></html>', 'text/html');
	console.log(doc+'');
  }
}).run();