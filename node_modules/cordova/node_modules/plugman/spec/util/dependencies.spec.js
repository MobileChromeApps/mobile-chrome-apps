var dependencies = require('../../src/util/dependencies'),
    xml_helpers = require('../../src/util/xml-helpers'),
    path = require('path'),
    config = require('../../src/util/config-changes');

describe('dependency module', function() {
    describe('generate_dependency_info method', function() {
        it('should return a list of top-level plugins based on what is inside a platform.json file', function() {
            var tlps = {
                "hello":"",
                "isitme":"",
                "yourelookingfor":""
            };
            spyOn(xml_helpers, 'parseElementtreeSync').andReturn({findall:function(){}});
            var spy = spyOn(config, 'get_platform_json').andReturn({
                installed_plugins:tlps,
                dependent_plugins:[]
            });
            var obj = dependencies.generate_dependency_info('some dir');
            expect(obj.top_level_plugins).toEqual(Object.keys(tlps));
        });
        it('should return a dependency graph for the plugins', function() {
            var tlps = {
                "A":"",
                "B":""
            };
            var deps = {
                "C":"",
                "D":"",
                "E":""
            };
            var spy = spyOn(config, 'get_platform_json').andReturn({
                installed_plugins:tlps,
                dependent_plugins:[]
            });
            var obj = dependencies.generate_dependency_info(path.join(__dirname, '..', 'plugins', 'dependencies'), 'android');
            expect(obj.graph.getChain('A')).toEqual(['C','D']);
            expect(obj.graph.getChain('B')).toEqual(['D', 'E']);
        });
    });
});
