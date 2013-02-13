// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.socket', function(runningInBackground) {
  it('should contain definitions', function() {
    expect(chrome.socket).toBeDefined();
    expect(chrome.socket.destroy).toBeDefined();
    expect(chrome.socket.connect).toBeDefined();
    expect(chrome.socket.bind).toBeDefined();
    expect(chrome.socket.disconnect).toBeDefined();
    expect(chrome.socket.read).toBeDefined();
    expect(chrome.socket.write).toBeDefined();
    expect(chrome.socket.recvFrom).toBeDefined();
    expect(chrome.socket.sendTo).toBeDefined();
    expect(chrome.socket.listen).toBeDefined();
    expect(chrome.socket.accept).toBeDefined();
    expect(chrome.socket.setKeepAlive).toBeDefined();
    expect(chrome.socket.setNoDelay).toBeDefined();
    expect(chrome.socket.getInfo).toBeDefined();
    expect(chrome.socket.getNetworkList).toBeDefined();
  });

  it('should have properties', function() {
  });

  describe('TCP tests', function() {
    var addr = 'localhost';
    var port = 1234;
    var arr = new Uint8Array(256);
    for (var i = 0; i < arr.length; i++) {
      arr[i] = i;
    }
    var data = arr.buffer;

    it('accept connect read write', asyncItWaitsForDone(function(done) {
      chrome.socket.create('tcp', {}, function(socketInfo) {
        expect(socketInfo).toBeTruthy();
        expect(socketInfo.socketId).toBeDefined();

        chrome.socket.listen(socketInfo.socketId, addr, port, function(listenResult) {
          expect(listenResult).toEqual(0);

          chrome.socket.accept(socketInfo.socketId, function(acceptInfo) {
            expect(acceptInfo).toBeTruthy();
            expect(acceptInfo.resultCode).toEqual(0);
            expect(acceptInfo.socketId).toBeDefined();

            chrome.socket.read(acceptInfo.socketId, function(readResult) {
              expect(readResult).toBeTruthy();
              expect(readResult.resultCode).toBeGreaterThan(0);
              expect(readResult.data).toBeTruthy();

              expect(Object.prototype.toString.call(data).slice(8,-1)).toEqual('ArrayBuffer');
              expect(Object.prototype.toString.call(readResult.data).slice(8,-1)).toEqual('ArrayBuffer');

              var sent = new Uint8Array(data);
              var recv = new Uint8Array(readResult.data);

              expect(recv.length).toEqual(sent.length);
              for (var i = 0; i < recv.length; i++) {
                expect(recv[i]).toEqual(sent[i]);
              }

              chrome.socket.disconnect(acceptInfo.socketId);
              chrome.socket.destroy(acceptInfo.socketId);
              chrome.socket.disconnect(socketInfo.socketId);
              chrome.socket.destroy(socketInfo.socketId);

              done();
            });
          });

          chrome.socket.create('tcp', {}, function(socketInfo) {
            expect(socketInfo).toBeTruthy();
            expect(socketInfo.socketId).toBeDefined();

            chrome.socket.connect(socketInfo.socketId, addr, port, function(connectResult) {
              expect(connectResult).toEqual(0);

              chrome.socket.write(socketInfo.socketId, data, function(writeResult) {
                expect(writeResult.bytesWritten).toBeGreaterThan(0);

                chrome.socket.disconnect(socketInfo.socketId);
                chrome.socket.destroy(socketInfo.socketId);
              });
            });
          });
        });
      });
    }));

    it('connect before accept', asyncItWaitsForDone(function(done) {
      chrome.socket.create('tcp', {}, function(socketInfo1) {
        expect(socketInfo1).toBeTruthy();
        expect(socketInfo1.socketId).toBeDefined();

        chrome.socket.listen(socketInfo1.socketId, addr, port, function(listenResult) {
          expect(listenResult).toEqual(0);

          chrome.socket.create('tcp', {}, function(socketInfo2) {
            expect(socketInfo2).toBeTruthy();
            expect(socketInfo2.socketId).toBeDefined();

            chrome.socket.connect(socketInfo2.socketId, addr, port, function(connectResult) {
              expect(connectResult).toEqual(0);

              chrome.socket.disconnect(socketInfo2.socketId);
              chrome.socket.destroy(socketInfo2.socketId);
            });

            setTimeout(function() {
              chrome.socket.accept(socketInfo1.socketId, function(acceptInfo) {
                expect(acceptInfo).toBeTruthy();
                expect(acceptInfo.resultCode).toEqual(0);
                expect(acceptInfo.socketId).toBeDefined();

                chrome.socket.disconnect(acceptInfo.socketId);
                chrome.socket.destroy(acceptInfo.socketId);
                chrome.socket.disconnect(socketInfo1.socketId);
                chrome.socket.destroy(socketInfo1.socketId);

                done();
              });
            }, 100);
          });
        });
      });
    }));

  });

  describe('UDP tests', function() {
    var addr = 'localhost';
    var port = 1234;
    var arr = new Uint8Array(256);
    for (var i = 0; i < arr.length; i++) {
      arr[i] = i;
    }
    var data = arr.buffer;

    it('bind recvFrom sendTo', asyncItWaitsForDone(function(done) {
      chrome.socket.create('udp', {}, function(socketInfo) {
        expect(socketInfo).toBeTruthy();
        expect(socketInfo.socketId).toBeDefined();

        chrome.socket.bind(socketInfo.socketId, addr, port, function(bindResult) {
          expect(bindResult).toEqual(0);

          chrome.socket.recvFrom(socketInfo.socketId, function(readResult) {
            expect(readResult).toBeTruthy();
            expect(readResult.resultCode).toBeGreaterThan(0);
            expect(readResult.data).toBeTruthy();

            expect(Object.prototype.toString.call(data).slice(8,-1)).toEqual('ArrayBuffer');
            expect(Object.prototype.toString.call(readResult.data).slice(8,-1)).toEqual('ArrayBuffer');

            var sent = new Uint8Array(data);
            var recv = new Uint8Array(readResult.data);

            expect(recv.length).toEqual(sent.length);
            for (var i = 0; i < recv.length; i++) {
              expect(recv[i]).toEqual(sent[i]);
            }

            chrome.socket.destroy(socketInfo.socketId);

            done();
          });

          chrome.socket.create('udp', {}, function(socketInfo) {
            expect(socketInfo).toBeTruthy();
            expect(socketInfo.socketId).toBeDefined();

            chrome.socket.sendTo(socketInfo.socketId, data, addr, port, function(writeResult) {
              expect(writeResult.bytesWritten).toBeGreaterThan(0);

              chrome.socket.destroy(socketInfo.socketId);
            });
          });
        });
      });
    }));


    it('bind connect x2 read write', asyncItWaitsForDone(function(done) {
      chrome.socket.create('udp', {}, function(socketInfo1) {
        expect(socketInfo1).toBeTruthy();
        expect(socketInfo1.socketId).toBeDefined();

        chrome.socket.bind(socketInfo1.socketId, addr, port, function(bindResult1) {
          expect(bindResult1).toEqual(0);

          chrome.socket.create('udp', {}, function(socketInfo2) {
            expect(socketInfo2).toBeTruthy();
            expect(socketInfo2.socketId).toBeDefined();

            chrome.socket.bind(socketInfo2.socketId, addr, port+1, function(bindResult2) {
              expect(bindResult2).toEqual(0);

              chrome.socket.connect(socketInfo1.socketId, addr, port+1, function(connectResult1) {
                expect(connectResult1).toEqual(0);

                chrome.socket.connect(socketInfo2.socketId, addr, port, function(connectResult2) {
                  expect(connectResult2).toEqual(0);

                  chrome.socket.read(socketInfo1.socketId, function(readResult) {
                    expect(readResult).toBeTruthy();
                    expect(readResult.resultCode).toBeGreaterThan(0);
                    expect(readResult.data).toBeTruthy();

                    expect(Object.prototype.toString.call(data).slice(8,-1)).toEqual('ArrayBuffer');
                    expect(Object.prototype.toString.call(readResult.data).slice(8,-1)).toEqual('ArrayBuffer');

                    var sent = new Uint8Array(data);
                    var recv = new Uint8Array(readResult.data);

                    expect(recv.length).toEqual(sent.length);
                    for (var i = 0; i < recv.length; i++) {
                      expect(recv[i]).toEqual(sent[i]);
                    }

                    chrome.socket.destroy(socketInfo1.socketId);

                    done();
                  });

                  chrome.socket.write(socketInfo2.socketId, data, function(writeResult) {
                    expect(writeResult.bytesWritten).toBeGreaterThan(0);

                    chrome.socket.destroy(socketInfo2.socketId);
                  });

                });
              });

            });
          });

        });
      });
    }));

  });
});
