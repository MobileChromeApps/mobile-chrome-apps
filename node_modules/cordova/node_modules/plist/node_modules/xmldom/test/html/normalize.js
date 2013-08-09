var wows = require('vows');
var assert = require('assert');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var parser = new DOMParser();
// Create a Test Suite
wows.describe('html normalizer').addBatch({
    'text & <': function () { 
    	var dom = new DOMParser().parseFromString('<div>&amp;&lt;123&456<789;&&</div>','text/html');
    	console.assert(dom == '<div>&amp;&lt;123&amp;456&lt;789;&amp;&amp;</div>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<div><123e>&<a<br/></div>','text/html');
    	console.assert(dom == '<div>&lt;123e>&amp;&lt;a<br/></div>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<div>&nbsp;&copy;&nbsp&copy</div>','text/html');
    	console.assert(dom == '<div>\u00a0\u00a9&amp;nbsp&amp;copy</div>',dom+'')
    	
    	
    	var dom = new DOMParser().parseFromString('<html xmlns:x="1"><body/></html>','text/html');
    	console.assert(dom == '<html xmlns:x="1"><body></body></html>',dom+'')
	},
    'attr': function () { 
    	var dom = new DOMParser().parseFromString('<html test="a<b && a>b && \'&amp;&&\'"/>','text/html');
    	console.assert(dom == '<html test="a&lt;b &amp;&amp; a>b &amp;&amp; \'&amp;&amp;&amp;\'"></html>',dom+'')
		
		var dom = new DOMParser().parseFromString('<div test="alert(\'<br/>\')"/>','text/html');
    	console.assert(dom == '<div test="alert(\'&lt;br/>\')"></div>',dom+'')
    	var dom = new DOMParser().parseFromString('<div test="a<b&&a< c && a>d"></div>','text/html');
    	console.assert(dom == '<div test="a&lt;b&amp;&amp;a&lt; c &amp;&amp; a>d"></div>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<div a=& bb c d=123&&456/>','text/html');
    	console.assert(dom == '<div a="&amp;" bb="bb" c="c" d="123&amp;&amp;456"></div>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<div a=& a="&\'\'" b/>','text/html');
    	console.assert(dom == '<div a="&amp;\'\'" b="b"></div>',dom+'')
	},
    'attrQute': function () { 
    	var dom = new DOMParser().parseFromString('<html test="123"/>','text/html');
    	console.assert(dom == '<html test="123"></html>',dom+'')
    	
//		var dom = new DOMParser().parseFromString('<r><Label onClick="doClick..>Hello, World</Label></r>','text/html');
//    	console.assert(dom == '<r><Label onClick="doClick..">Hello, World</Label></r>',dom+'!!')
//		
		var dom = new DOMParser().parseFromString('<Label onClick=doClick..">Hello, World</Label>','text/html');
    	console.assert(dom == '<Label onClick="doClick..">Hello, World</Label>',dom+'')
	},
	"unclosed":function(){
    	var dom = new DOMParser().parseFromString('<html><meta><link><img><br><hr><input></html>','text/html');
    	console.assert(dom == '<html><meta/><link/><img/><br/><hr/><input/></html>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<html title =1/2></html>','text/html');
    	console.assert(dom == '<html title="1/2"></html>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<html title= 1/>','text/html');
    	console.assert(dom == '<html title="1"></html>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<html title = 1/>','text/html');
    	console.assert(dom == '<html title="1"></html>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<html title/>','text/html');
    	console.assert(dom == '<html title="title"></html>',dom+'')
    	
    	
    	
    	var dom = new DOMParser().parseFromString('<html><meta><link><img><br><hr><input></html>','text/html');
    	console.assert(dom == '<html><meta/><link/><img/><br/><hr/><input/></html>',dom+'')
    	
    	
	},
    'script': function () { 
    	var dom = new DOMParser().parseFromString('<script>alert(a<b&&c?"<br>":">>");</script>','text/html');
    	console.assert(dom == '<script>alert(a<b&&c?"<br>":">>");</script>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<script>alert(a<b&&c?"<br>":">>");</script>','text/xml');
    	console.assert(dom == '<script>alert(a&lt;b&amp;&amp;c?"<br/>":">>");</script>',dom+'')
    	
    	var dom = new DOMParser().parseFromString('<script>alert(a<b&&c?"<br/>":">>");</script>','text/html');
    	console.assert(dom == '<script>alert(a<b&&c?"<br/>":">>");</script>',dom+'')

	},
    'textarea': function () { 
    	var dom = new DOMParser().parseFromString('<textarea>alert(a<b&&c?"<br>":">>");</textarea>','text/html');
    	console.assert(dom == '<textarea>alert(a&lt;b&amp;&amp;c?"&lt;br>":">>");</textarea>',dom+'')
    	
    	
    	var dom = new DOMParser().parseFromString('<textarea>alert(a<b&&c?"<br>":">>");</textarea>','text/xml');
    	console.assert(dom == '<textarea>alert(a&lt;b&amp;&amp;c?"<br/>":">>");</textarea>',dom+'')
	}
}).run();