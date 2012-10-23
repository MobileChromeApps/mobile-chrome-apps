/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
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

describe('FileTransfer', function() {
    // https://github.com/don/cordova-filetransfer
    var server = "http://cordova-filetransfer.jitsu.com";

    // deletes and re-creates the specified content
    var writeFile = function(fileName, fileContent, success, error) {
        deleteFile(fileName, function() {
            root.getFile(fileName, {create: true}, function(fileEntry) {
                fileEntry.createWriter(function (writer) {

                    writer.onwrite = function(evt) {
                        success(fileEntry);
                    };

                    writer.onabort = function(evt) {
                        error(evt);
                    };

                    writer.error = function(evt) {
                        error(evt);
                    };

                    writer.write(fileContent + "\n");
                }, error);
            }, error);
        });
    };

    var readFileEntry = function(entry, success, error) {
        entry.file(function(file) {
            var reader = new FileReader();
            reader.onerror = error;
            reader.onload = function(e) {
                success(reader.result);
            };
            reader.readAsText(file);
        }, error);
    };

    var getMalformedUrl = function() {
        if (device.platform.match(/Android/i)) {
            // bad protocol causes a MalformedUrlException on Android
            return "httpssss://example.com";
        } else {
            // iOS doesn't care about protocol, space in hostname causes error
            return "httpssss://exa mple.com";
        }
    };

    // deletes file, if it exists, then invokes callback
    var deleteFile = function(fileName, callback) {
        callback = callback || function() {};
        var spy = jasmine.createSpy().andCallFake(callback);
        root.getFile(fileName, null,
            // remove file system entry
            function(entry) {
                entry.remove(spy, spy);
            },
            // doesn't exist
            spy);
        waitsFor(function() { return spy.wasCalled; }, Tests.TEST_TIMEOUT);
    };

    it("should exist and be constructable", function() {
        var ft = new FileTransfer();
        expect(ft).toBeDefined();
    });
    it("should contain proper functions", function() {
        var ft = new FileTransfer();
        expect(typeof ft.upload).toBe('function');
        expect(typeof ft.download).toBe('function');
    });
    describe('FileTransferError', function() {
        it("FileTransferError constants should be defined", function() {
            expect(FileTransferError.FILE_NOT_FOUND_ERR).toBe(1);
            expect(FileTransferError.INVALID_URL_ERR).toBe(2);
            expect(FileTransferError.CONNECTION_ERR).toBe(3);
        });
    });

    describe('download method', function() {

        // NOTE: if download tests are failing, check the white list
        // Android
        //   <access origin="httpssss://example.com"/>
        //   <access origin="apache.org" subdomains="true" />
        //   <access origin="cordova-filetransfer.jitsu.com"/>
        // iOS
        //   # Cordova.plist
        //   ExternalHosts
        //     - Item 1 String cordova-filetransfer.jitsu.com
        //     - Item 2 String *.apache.org

        it("should be able to download a file using http", function() {
            var fail = createDoNotCallSpy('downloadFail');
            var remoteFile = server + "/robots.txt"
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var lastProgressEvent = null;

            var downloadWin = jasmine.createSpy().andCallFake(function(entry) {
                expect(entry.name).toBe(localFileName);
                expect(lastProgressEvent.loaded).toBeGreaterThan(1);
            });

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                var ft = new FileTransfer();
                ft.onprogress = function(e) {
                    lastProgressEvent = e;
                };
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, fail);
            });

            waitsForAny(downloadWin, fail);
        });
        it("should be able to download a file using https", function() {
            var remoteFile = "https://www.apache.org/licenses/";
            var localFileName = 'httpstest.html';
            var downloadFail = createDoNotCallSpy('downloadFail', 'Ensure ' + remoteFile + ' is in the white-list');
            var fileFail = createDoNotCallSpy('fileFail');
            var downloadWin = function(entry) {
                readFileEntry(entry, fileWin, fileFail);
            };
            var fileWin = jasmine.createSpy().andCallFake(function(content) {
                expect(content).toMatch(/The Apache Software Foundation/); 
            });

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, downloadFail);
            });

            waitsForAny(fileWin, downloadFail, fileFail);
        });
        it("should be stopped by abort() right away", function() {
            var downloadWin = createDoNotCallSpy('downloadWin');
            var remoteFile = 'http://audio.ibeat.org/content/p1rj1s/p1rj1s_-_rockGuitar.mp3';
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var startTime = +new Date();

            var downloadFail = jasmine.createSpy().andCallFake(function(e) {
                expect(e.code).toBe(FileTransferError.ABORT_ERR);
                expect(new Date() - startTime).toBeLessThan(300);
            });

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                var ft = new FileTransfer();
                ft.abort(); // should be a no-op.
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, downloadFail);
                ft.abort();
                ft.abort(); // should be a no-op.
            });

            waitsForAny(downloadWin, downloadFail);
        });
        it("should get http status on failure", function() {
            var downloadWin = createDoNotCallSpy('downloadWin');

            var remoteFile = server + "/404";
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var downloadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.http_status).toBe(404);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
            });

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, downloadFail);
            });

            waitsForAny(downloadWin, downloadFail);
        });
        it("should handle malformed urls", function() {
            var downloadWin = createDoNotCallSpy('downloadWin');

            var remoteFile = getMalformedUrl();
            var localFileName = "download_malformed_url.txt";
            var downloadFail = jasmine.createSpy().andCallFake(function(error) {
                // Note: Android needs the bad protocol to be added to the access list
                // <access origin=".*"/> won't match because ^https?:// is prepended to the regex
                // The bad protocol must begin with http to avoid automatic prefix
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
                expect(error.code).toBe(FileTransferError.INVALID_URL_ERR);
            });

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, downloadFail);
            });

            waitsForAny(downloadWin, downloadFail);
        });
        it("should handle unknown host", function() {
            var downloadWin = createDoNotCallSpy('downloadWin');

            var remoteFile = "http://foobar.apache.org/index.html";
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var downloadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.CONNECTION_ERR);
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, downloadFail);
            });

            waitsForAny(downloadWin, downloadFail);
        });
        it("should handle bad file path", function() {
            var downloadWin = createDoNotCallSpy('downloadWin');

            var remoteFile = server;
            var badFilePath = "c:\\54321";
            var downloadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.FILE_NOT_FOUND_ERR);
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, badFilePath, downloadWin, downloadFail);
            });

            waitsForAny(downloadWin, downloadFail);
        });
    });
    describe('upload method', function() {

        it("should be able to upload a file", function() {
            var remoteFile = server + "/upload";
            var localFileName = "upload.txt";
            var fileContents = 'This file should upload';

            var fileFail = createDoNotCallSpy('fileFail');
            var uploadFail = createDoNotCallSpy('uploadFail', "Ensure " + remoteFile + " is in the white list");
            var lastProgressEvent = null;

            var uploadWin = jasmine.createSpy().andCallFake(function(uploadResult) {
                expect(uploadResult.bytesSent).toBeGreaterThan(0);
                expect(uploadResult.responseCode).toBe(200);
                expect(uploadResult.response).toMatch(/fields:\s*{\s*value1.*/);
            });

            var fileWin = function(fileEntry) {
                ft = new FileTransfer();

                var options = new FileUploadOptions();
                options.fileKey = "file";
                options.fileName = localFileName;
                options.mimeType = "text/plain";

                var params = new Object();
                params.value1 = "test";
                params.value2 = "param";
                options.params = params;

                ft.onprogress = function(e) {
                    expect(e.lengthComputable).toBe(true);
                    expect(e.total).toBeGreaterThan(0);
                    expect(e.loaded).toBeGreaterThan(0);
                    lastProgressEvent = e;
                };

                // removing options cause Android to timeout
                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, options);
            };

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                writeFile(localFileName, fileContents, fileWin, fileFail);
            });

            waitsForAny(uploadWin, uploadFail, fileFail);
            runs(function() {
                expect(lastProgressEvent).not.toBeNull('expected progress events');
            });
        });
        it("should be stopped by abort() right away.", function() {
            var remoteFile = server + "/upload";
            var localFileName = "upload.txt";

            var fileFail = createDoNotCallSpy('fileFail');
            var uploadWin = createDoNotCallSpy('uploadWin', 'Should have been aborted');
            var startTime;

            var uploadFail = jasmine.createSpy().andCallFake(function(e) {
                expect(e.code).toBe(FileTransferError.ABORT_ERR);
                expect(new Date() - startTime).toBeLessThan(300);
            });

            var fileWin = function(fileEntry) {
                ft = new FileTransfer();

                var options = new FileUploadOptions();
                options.fileKey = "file";
                options.fileName = localFileName;
                options.mimeType = "text/plain";

                startTime = +new Date();
                // removing options cause Android to timeout
                ft.abort(); // should be a no-op.
                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, options);
                ft.abort();
                ft.abort(); // should be a no-op.
            };

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                writeFile(localFileName, new Array(10000).join('aborttest!'), fileWin, fileFail);
            });

            waitsForAny(uploadWin, uploadFail, fileFail);
        });
        it("should get http status on failure", function() {
            var fileFail = createDoNotCallSpy('fileFail');
            var uploadWin = createDoNotCallSpy('uploadWin');

            var remoteFile = server + "/403";
            var localFileName = "upload_expect_fail.txt";
            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.http_status).toBe(403);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
            });

            var fileWin = function(fileEntry) {
                var ft = new FileTransfer();

                var options = new FileUploadOptions();
                options.fileKey="file";
                options.fileName=fileEntry.name;
                options.mimeType="text/plain";

                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, options);
            };

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                writeFile(localFileName, "this file should fail to upload", fileWin, fileFail);
            });

            waitsForAny(uploadWin, uploadFail, fileFail);
        });
        it("should handle malformed urls", function() {
            var fileFail = createDoNotCallSpy('fileFail');
            var uploadWin = createDoNotCallSpy('uploadWin');

            var remoteFile = getMalformedUrl();
            var localFileName = "malformed_url.txt";
            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.INVALID_URL_ERR);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
            });
            var fileWin = function(fileEntry) {
                var ft = new FileTransfer();
                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, {});
            };

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                writeFile(localFileName, "Some content", fileWin, fileFail);
            });

            waitsForAny(uploadWin, uploadFail, fileFail);
        });
        it("should handle unknown host", function() {
            var fileFail = createDoNotCallSpy('fileFail');
            var uploadWin = createDoNotCallSpy('uploadWin');

            var remoteFile = "http://foobar.apache.org/robots.txt";
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.CONNECTION_ERR);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
            });
            var fileWin = function(fileEntry) {
                var ft = new FileTransfer();
                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, {});
            };

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                writeFile(localFileName, "# allow all", fileWin, fileFail);
            });

            waitsForAny(uploadWin, uploadFail, fileFail);
        });
        it("should handle missing file", function() {
            var uploadWin = createDoNotCallSpy('uploadWin');

            var remoteFile = server + "/upload";
            var localFileName = "does_not_exist.txt";

            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.FILE_NOT_FOUND_ERR);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.upload(root.fullPath + "/" + localFileName, remoteFile, uploadWin, uploadFail);
            });

            waitsForAny(uploadWin, uploadFail);
        });
        it("should handle bad file path", function() {
            var uploadWin = createDoNotCallSpy('uploadWin');

            var remoteFile = server + "/upload";

            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.FILE_NOT_FOUND_ERR);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.upload("/usr/local/bad/file/path.txt", remoteFile, uploadWin, uploadFail);
            });

            waitsForAny(uploadWin, uploadFail);
        });
        it("should be able to set custom headers", function() {
            var remoteFile = "http://whatheaders.com";
            var localFileName = "upload.txt";

            var fileFail = function() {};
            var uploadFail = createDoNotCallSpy('uploadFail', "Ensure " + remoteFile + " is in the white list and that Content-Length header is being set.");

            var uploadWin = jasmine.createSpy().andCallFake(function(uploadResult) {
                expect(uploadResult.bytesSent).toBeGreaterThan(0);
                expect(uploadResult.responseCode).toBe(200);
                expect(uploadResult.response).toBeDefined();
                var responseHtml = decodeURIComponent(uploadResult.response);
                expect(responseHtml).toMatch(/CustomHeader1[\s\S]*CustomValue1/i);
                expect(responseHtml).toMatch(/CustomHeader2[\s\S]*CustomValue2[\s\S]*CustomValue3/i, "Should allow array values");
            });

            var fileWin = function(fileEntry) {
                ft = new FileTransfer();

                var options = new FileUploadOptions();
                options.fileKey = "file";
                options.fileName = localFileName;
                options.mimeType = "text/plain";

                var params = new Object();
                params.value1 = "test";
                params.value2 = "param";
                options.params = params;
                options.headers = {
                    "CustomHeader1": "CustomValue1",
                    "CustomHeader2": ["CustomValue2", "CustomValue3"],
                };

                // removing options cause Android to timeout
                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, options);
            };

            this.after(function() {
                deleteFile(localFileName);
            });
            runs(function() {
                writeFile(localFileName, "this file should upload", fileWin, fileFail);
            });

            waitsForAny(uploadWin, uploadFail);
        });
    });
});
