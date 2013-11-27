var path = require('path')
    , common = require('./common');

module.exports = {
    www_dir: function(project_dir) {
        return path.join(project_dir, 'www');
    },
    package_name:function(project_dir) {
        var config_path = path.join(module.exports.www_dir(project_dir), 'config.xml');
        var widget_doc = xml_helpers.parseElementtreeSync(config_path);
        return widget_doc._root.attrib['id'];
    },
    "source-file":{
        install:function(source_el, plugin_dir, project_dir, plugin_id) {
            var dest = path.join(source_el.attrib['target-dir'], path.basename(source_el.attrib['src']));
            common.copyFile(plugin_dir, source_el.attrib['src'], project_dir, dest);
        },
        uninstall:function(source_el, project_dir, plugin_id) {
            var dest = path.join(source_el.attrib['target-dir'], path.basename(source_el.attrib['src']));
            common.removeFile(project_dir, dest);
        }
    }
};
