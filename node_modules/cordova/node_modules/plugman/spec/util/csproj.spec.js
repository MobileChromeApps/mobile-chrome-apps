var csproj  = require('../../src/util/csproj'),
    path    = require('path'),
    os      = require('osenv'),
    et      = require('elementtree'),
    fs      = require('fs'),
    xml_helpers = require('../../src/util/xml-helpers');

var wp7_project     = path.join(__dirname, '..', 'projects', 'wp7'),
    wp8_project     = path.join(__dirname, '..', 'projects', 'wp8'),
    temp            = path.join(os.tmpdir(), 'plugman'),
    example1_csproj  = path.join(wp7_project, 'CordovaAppProj.csproj'),
    example2_csproj  = path.join(wp8_project, 'CordovaAppProj.csproj'),
    wpcsproj        = path.join(__dirname, '..', 'plugins', 'WPcsproj');

describe('csproj', function() {
    it('should throw if passed in an invalid xml file path ref', function() {
        expect(function() {
            new csproj('blahblah');
        }).toThrow();
    });
    it('should successfully parse a valid csproj file into an xml document', function() {
        var doc;
        expect(function() {
            doc = new csproj(example1_csproj);
        }).not.toThrow();
        expect(doc.xml.getroot()).toBeDefined();
    });

    describe('write method', function() {
        
    });

    describe('source file', function() {

        var test_csproj;
        var page_test   = path.join('src', 'UI', 'PageTest.xaml');
        var page_test_cs = path.join('src', 'UI', 'PageTest.xaml.cs');
        var lib_test    = path.join('lib', 'LibraryTest.dll');
        var file_test   = path.join('src', 'FileTest.cs');
        var content_test   = path.join('src', 'Content.img');

        describe('add method', function() {
            var test_csproj = new csproj(example1_csproj);
            it('should properly add .xaml files', function() {
                test_csproj.addSourceFile(page_test);
                expect(test_csproj.xml.getroot().find('.//Page[@Include="src\\UI\\PageTest.xaml"]')).toBeTruthy();        
                expect(test_csproj.xml.getroot().find('.//Page[@Include="src\\UI\\PageTest.xaml"]/Generator').text).toEqual('MSBuild:Compile');
                expect(test_csproj.xml.getroot().find('.//Page[@Include="src\\UI\\PageTest.xaml"]/SubType').text).toEqual('Designer');
            });
            it('should properly add .xaml.cs files', function() {
                test_csproj.addSourceFile(page_test_cs);
                expect(test_csproj.xml.getroot().find('.//Compile[@Include="src\\UI\\PageTest.xaml.cs"]')).toBeTruthy();
                expect(test_csproj.xml.getroot().find('.//Compile[@Include="src\\UI\\PageTest.xaml.cs"]/DependentUpon').text).toEqual('PageTest.xaml');
            });
            it('should properly add .dll references', function() {
                test_csproj.addSourceFile(lib_test);
                expect(test_csproj.xml.getroot().find('.//Reference[@Include="LibraryTest"]')).toBeTruthy();
                expect(test_csproj.xml.getroot().find('.//Reference[@Include="LibraryTest"]/HintPath').text).toEqual('lib\\LibraryTest.dll');
            });
            it('should properly add .cs files', function() {
                test_csproj.addSourceFile(file_test);
                expect(test_csproj.xml.getroot().find('.//Compile[@Include="src\\FileTest.cs"]')).toBeTruthy();
            });
            it('should properly add content files', function() {
                test_csproj.addSourceFile(content_test);
                expect(test_csproj.xml.getroot().find('.//Content[@Include="src\\Content.img"]')).toBeTruthy();
            });
        });

        describe('remove method', function() {
            var test_csproj = new csproj(example2_csproj);
            it('should properly remove .xaml pages', function() {
                test_csproj.removeSourceFile(page_test);
                expect(test_csproj.xml.getroot().find('.//Page[@Include="src\\UI\\PageTest.xaml"]')).toBeFalsy();
            });
            it('should properly remove .xaml.cs files', function() {
                test_csproj.removeSourceFile(page_test_cs);
                expect(test_csproj.xml.getroot().find('.//Compile[@Include="src\\UI\\PageTest.xaml.cs"]')).toBeFalsy();
            });
            it('should properly remove .dll references', function() {
                test_csproj.removeSourceFile(lib_test);
                expect(test_csproj.xml.getroot().find('.//Reference[@Include="LibraryTest"]')).toBeFalsy();
            });
            it('should properly remove .cs files', function() {
                test_csproj.removeSourceFile(file_test);
                expect(test_csproj.xml.getroot().find('.//Compile[@Include="src\\FileTest.cs"]')).toBeFalsy();
            });
            it('should properly remove content files', function() {
                test_csproj.removeSourceFile(content_test);
                expect(test_csproj.xml.getroot().find('.//Content[@Include="src\\Content.img"]')).toBeFalsy();
            });
            it('should remove all empty ItemGroup\'s', function() {
                test_csproj.removeSourceFile(page_test);
                test_csproj.removeSourceFile(page_test_cs);
                test_csproj.removeSourceFile(lib_test);
                test_csproj.removeSourceFile(file_test);
                var item_groups = test_csproj.xml.findall('ItemGroup');
                for (var i = 0, l = item_groups.length; i < l; i++) {
                    var group = item_groups[i];
                    expect(group._children.length).toBeGreaterThan(0);
                }
            })

        });
    });
});
