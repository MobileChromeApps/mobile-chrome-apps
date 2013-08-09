/*
 *
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
var common = require('../../src/platforms/common')
  , path = require('path')
  , fs = require('fs')
  , osenv = require('osenv')
  , shell = require('shelljs')
  , test_dir = path.join(osenv.tmpdir(), 'test_plugman') 
  , project_dir = path.join(test_dir, 'project')
  , src = path.join(project_dir, 'src')
  , dest = path.join(project_dir, 'dest')
  , java_dir = path.join(src, 'one', 'two', 'three')
  , java_file = path.join(java_dir, 'test.java');

describe('common platform handler', function() {
    describe('resolveSrcPath', function() {
        it('should throw if path cannot be resolved', function(){  
            expect(function(){common.resolveSrcPath(test_dir, 'I_dont_exist')}).toThrow();
        });
        
        it('should not throw if path exists', function(){
            shell.mkdir('-p', test_dir);
            var target = path.join(test_dir, 'somefile');
            fs.writeFileSync(target, '80085', 'utf-8');
            expect(function(){common.resolveSrcPath(test_dir, 'somefile')}).not.toThrow();
            shell.rm('-rf', test_dir);
        });
    });

    describe('resolveTargetPath', function() {
        it('should throw if path exists', function(){
            shell.mkdir('-p', test_dir);
            expect(function(){common.resolveTargetPath(test_dir)}).toThrow();
            shell.rm('-rf', test_dir);
        });
        
        it('should not throw if path cannot be resolved', function(){
            expect(function(){common.resolveTargetPath(test_dir, 'somefile')}).not.toThrow();
        });
    });

    describe('copyFile', function() {    
        it('should throw if source path cannot be resolved', function(){
            expect(function(){common.copyFile(test_dir, src, project_dir, dest)}).toThrow();
        });
        
        it('should throw if target path exists', function(){
            shell.mkdir('-p', dest);
            expect(function(){common.copyFile(test_dir, src, project_dir, dest)}).toThrow();
            shell.rm('-rf', dest);
        });
        
        it('should call mkdir -p on target path', function(){
            shell.mkdir('-p', java_dir);
            fs.writeFileSync(java_file, 'contents', 'utf-8');
            
            var s = spyOn(shell, 'mkdir').andCallThrough();
            var resolvedDest = common.resolveTargetPath(project_dir, dest);
            
            common.copyFile(test_dir, java_file, project_dir, dest);
            
            expect(s).toHaveBeenCalled();
            expect(s).toHaveBeenCalledWith('-p', path.dirname(resolvedDest));
            shell.rm('-rf', project_dir);            
        });
            
        it('should call cp source/dest paths', function(){
            shell.mkdir('-p', java_dir);
            fs.writeFileSync(java_file, 'contents', 'utf-8');
            
            var s = spyOn(shell, 'cp').andCallThrough();
            var resolvedDest = common.resolveTargetPath(project_dir, dest);
            
            common.copyFile(test_dir, java_file, project_dir, dest);
            
            expect(s).toHaveBeenCalled();
            expect(s).toHaveBeenCalledWith(java_file, resolvedDest);

            shell.rm('-rf', project_dir);         
        });

    });

    describe('deleteJava', function() {
        it('should call fs.unlinkSync on the provided paths', function(){
            shell.mkdir('-p', java_dir);
            fs.writeFileSync(java_file, 'contents', 'utf-8');
            
            var s = spyOn(fs, 'unlinkSync').andCallThrough();
            common.deleteJava(project_dir, java_file); 
            expect(s).toHaveBeenCalled();
            expect(s).toHaveBeenCalledWith(path.resolve(project_dir, java_file));
            
            shell.rm('-rf', java_dir);
        });
        
        it('should delete empty directories after removing source code in a java src path heirarchy', function(){
            shell.mkdir('-p', java_dir);
            fs.writeFileSync(java_file, 'contents', 'utf-8');
            
            common.deleteJava(project_dir, java_file); 
            expect(fs.existsSync(java_file)).not.toBe(true);
            expect(fs.existsSync(java_dir)).not.toBe(true);
            expect(fs.existsSync(path.join(src,'one'))).not.toBe(true);
            
            shell.rm('-rf', java_dir);
        });
        
        it('should never delete the top-level src directory, even if all plugins added were removed', function(){
            shell.mkdir('-p', java_dir);
            fs.writeFileSync(java_file, 'contents', 'utf-8');
            
            common.deleteJava(project_dir, java_file); 
            expect(fs.existsSync(src)).toBe(true);
            
            shell.rm('-rf', java_dir);
        });
    });
});
