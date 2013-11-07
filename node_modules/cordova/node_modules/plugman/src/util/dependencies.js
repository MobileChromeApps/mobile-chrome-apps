var dep_graph = require('dep-graph'),
    path = require('path'),
    config_changes = require('./config-changes'),
    underscore = require('underscore'),
    xml_helpers = require('./xml-helpers');

module.exports = {
    generate_dependency_info:function(plugins_dir, platform) {
        var json = config_changes.get_platform_json(plugins_dir, platform);
        var tlps = [];
        var graph = new dep_graph();
        Object.keys(json.installed_plugins).forEach(function(tlp) {
            tlps.push(tlp);
            var xml = xml_helpers.parseElementtreeSync(path.join(plugins_dir, tlp, 'plugin.xml'));
            var deps = xml.findall('dependency');
            deps && deps.forEach(function(dep) {
                var id = dep.attrib.id;
                graph.add(tlp, id);
            });
        });
        Object.keys(json.dependent_plugins).forEach(function(plug) {
            var xml = xml_helpers.parseElementtreeSync(path.join(plugins_dir, plug, 'plugin.xml'));
            var deps = xml.findall('dependency');
            deps && deps.forEach(function(dep) {
                var id = dep.attrib.id;
                graph.add(plug, id);
            });
        });

        return {
            graph:graph,
            top_level_plugins:tlps
        };
    },

    // Returns a list of top-level plugins which are (transitively) dependent on the given plugin.
    dependents: function(plugin_id, plugins_dir, platform) {
        var dependency_info = module.exports.generate_dependency_info(plugins_dir, platform);
        var graph = dependency_info.graph;

        var tlps = dependency_info.top_level_plugins;
        var dependents = tlps.filter(function(tlp) {
            return tlp != plugin_id && graph.getChain(tlp).indexOf(plugin_id) >= 0;
        });

        return dependents;
    },

    // Returns a list of plugins which the given plugin depends on, for which it is the only dependent.
    // In other words, if the given plugin were deleted, these dangling dependencies should be deleted too.
    danglers: function(plugin_id, plugins_dir, platform) {
        var dependency_info = module.exports.generate_dependency_info(plugins_dir, platform);
        var graph = dependency_info.graph;
        var dependencies = graph.getChain(plugin_id);

        var tlps = dependency_info.top_level_plugins;
        var diff_arr = [];
        tlps.forEach(function(tlp) {
            if (tlp != plugin_id) {
                diff_arr.push(graph.getChain(tlp));
            }
        });

        // if this plugin has dependencies, do a set difference to determine which dependencies are not required by other existing plugins
        diff_arr.unshift(dependencies);
        var danglers = underscore.difference.apply(null, diff_arr);

        // Ensure no top-level plugins are tagged as danglers.
        danglers = danglers && danglers.filter(function(x) { return tlps.indexOf(x) < 0; });
        return danglers;
    }
};
