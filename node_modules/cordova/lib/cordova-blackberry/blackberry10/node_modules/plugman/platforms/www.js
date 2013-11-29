/*
 *
 * Copyright 2013 Anis Kadri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var path = require('path')
  , fs = require('fs')
  , shell = require('shelljs');

exports.handlePlugin = function (action, project_dir, plugin_dir, plugin_et) {    
    var assets = plugin_et.findall('./asset')
      , i = 0;
   
    // move asset files into www
    assets.forEach(function (asset) {
        var srcPath = path.resolve(
                        plugin_dir, asset.attrib['src']);

        var targetPath = path.resolve(
                            project_dir, asset.attrib['target']);

        var st = fs.statSync(srcPath);    
        if (st.isDirectory()) {
            shell.cp('-R', srcPath, project_dir);
        } else {
            shell.cp(srcPath, targetPath);
        }
    });
}
