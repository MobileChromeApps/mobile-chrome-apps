var fs = require('fs'),
    path = require('path');

var filename = '.fetch.json';

exports.get_fetch_metadata = function(plugin_dir) {
    var filepath = path.join(plugin_dir, filename);
    if (fs.existsSync(filepath)) {
        return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    } else {
        return {};
    }
};

exports.save_fetch_metadata = function(plugin_dir, data) {
    var filepath = path.join(plugin_dir, '.fetch.json');
    fs.writeFileSync(filepath, JSON.stringify(data), 'utf-8');
};

