var xml_helpers = require('./xml-helpers'),
    et = require('elementtree'),
    fs = require('fs');

function csproj(location) {
    this.location = location;
    this.xml = xml_helpers.parseElementtreeSync(location);
    return this;
}

csproj.prototype = {
    write:function() {
        fs.writeFileSync(this.location, this.xml.write({indent:4}), 'utf-8');
    },
    addSourceFile:function(relative_path) {
        relative_path = relative_path.split('/').join('\\');
        // make ItemGroup to hold file.
        var item = new et.Element('ItemGroup');
        // check if it's a .xaml page
        if(relative_path.indexOf('.xaml', relative_path.length - 5) > -1) {
            var page = new et.Element('Page');
            var sub_type = new et.Element('SubType');
            sub_type.text = "Designer";
            page.append(sub_type);
            page.attrib.Include = relative_path;
            var gen = new et.Element('Generator');
            gen.text = "MSBuild:Compile";
            page.append(gen);
            var item_groups = this.xml.findall('ItemGroup');
            if(item_groups.length == 0) {
                item.append(page);
            } else {
                item_groups[0].append(page);
            }
        }
        // check if it's a .xaml.cs page that would depend on a .xaml of the same name
        else if (relative_path.indexOf('.xaml.cs', relative_path.length - 8) > -1) {
            var compile = new et.Element('Compile');
            compile.attrib.Include = relative_path;
            var dep = new et.Element('DependentUpon');
            var parts = relative_path.split('\\');
            var xaml_file = parts[parts.length - 1].substr(0, parts[parts.length - 1].length - 3);
            dep.text = xaml_file;
            compile.append(dep);
            item.append(compile);
        }
        // check if it's a .dll that we should add as a reference.
        else if (relative_path.indexOf('.dll', relative_path.length - 4) > -1) {
            var compile = new et.Element('Reference');
            // add dll name
            var parts = relative_path.split('\\');
            var dll_name = parts[parts.length - 1].substr(0, parts[parts.length - 1].length - 4);
            compile.attrib.Include = dll_name;
            // add hint path with full path
            var hint_path = new et.Element('HintPath');
            hint_path.text = relative_path;
            compile.append(hint_path);
            item.append(compile);
        }
        // otherwise add it normally
        else if (relative_path.indexOf('.cs', relative_path.length - 3) > -1) {
            var compile = new et.Element('Compile');
            compile.attrib.Include = relative_path;
            item.append(compile);
        }
        else {
            var compile = new et.Element('Content');
            compile.attrib.Include = relative_path;
            item.append(compile);
        }
        this.xml.getroot().append(item);
    },
    removeSourceFile:function(relative_path) {
        relative_path = relative_path.split('/').join('\\');
        var item_groups = this.xml.findall('ItemGroup');
        for (var i = 0, l = item_groups.length; i < l; i++) {
            var group = item_groups[i];
            var files = group.findall('Compile').concat(group.findall('Page')).concat(group.findall('Content'));
            for (var j = 0, k = files.length; j < k; j++) {
                var file = files[j];
                if (file.attrib.Include == relative_path) {
                    // remove file reference
                    group.remove(0, file);
                    // remove ItemGroup if empty
                    var new_group = group.findall('Compile').concat(group.findall('Page')).concat(group.findall('Content'));
                    if(new_group.length < 1) {
                        this.xml.getroot().remove(0, group);
                    }
                    return true;
                }
            }
            // for removing .dll reference
            var references = group.findall('Reference');
            for (var j = 0, k = references.length; j < k; j++) {
                var reference = references[j];
                var parts = relative_path.split('\\');
                var dll_name = parts[parts.length - 1].substr(0, parts[parts.length - 1].length - 4);
                if(reference.attrib.Include == dll_name) {
                    // remove file reference
                    group.remove(0, reference);
                     // remove ItemGroup if empty
                    var new_group = group.findall('Compile').concat(group.findall('Page'));
                    if(new_group.length < 1) {
                        this.xml.getroot().remove(0, group);
                    }
                    return true;
                }
            }
        }
        return false;
    }
};

module.exports = csproj;
