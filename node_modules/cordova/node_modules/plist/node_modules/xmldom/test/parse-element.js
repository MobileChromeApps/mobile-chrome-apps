var wows = require('vows');
var assert = require('assert');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var parser = new DOMParser();
// Create a Test Suite
wows.describe('XML Node Parse').addBatch({
    'noAttribute': function () { 
    	var dom = new DOMParser().parseFromString('<xml ></xml>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml></xml>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml />','text/xml');
    	var dom = new DOMParser().parseFromString('<xml/>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml/>','text/xml');
	},
    'simpleAttribute': function () { 
    	var dom = new DOMParser().parseFromString('<xml a="1" b="2"></xml>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml a="1" b="2" ></xml>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml a="1" b=\'\'></xml>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml a="1" b=\'\' ></xml>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml a="1" b="2/">','text/xml');
    	var dom = new DOMParser().parseFromString('<xml a="1" b="2" />','text/xml');
    	var dom = new DOMParser().parseFromString('<xml  a="1" b=\'\'/>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml  a="1" b=\'\' />','text/xml');
	},
    'nsAttribute': function () { 
    	var dom = new DOMParser().parseFromString('<xml xmlns="1" xmlns:a="2" a:test="3"></xml>','text/xml');
    	var dom = new DOMParser().parseFromString('<xml xmlns="1" xmlns:a="2" a:test="3" ></xml>','text/xml');
     	var dom = new DOMParser().parseFromString('<xml xmlns="1" xmlns:a="2" a:test="3/">','text/xml');
    	var dom = new DOMParser().parseFromString('<xml xmlns="1" xmlns:a="2" a:test="3" />','text/xml');
	}
}).run();