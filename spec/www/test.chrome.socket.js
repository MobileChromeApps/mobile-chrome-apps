// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.socket', function(runningInBackground) {
  var addr = '127.0.0.1';
  var port = Math.floor(Math.random() * 5000) + 5000;
  var arr = new Uint8Array(256);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = i;
  }
  var data = arr.buffer;

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

  describe('System', function() {
    itWaitsForDone('getNetworkList', function(done) {
      chrome.socket.getNetworkList(function(result) {
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
        result.forEach(function(networkInterface) {
          expect(networkInterface.name).toBeTruthy();
          expect(networkInterface.address).toBeTruthy();
        });
        done();
      });
    });
  });

  describe('TCP', function() {
    var createInfo = null;

    beforeEachWaitsForDone(function(done) {
      chrome.socket.create('tcp', function(ci) {
        createInfo = ci;

        expect(createInfo).toBeTruthy();
        expect(createInfo.socketId).toBeDefined();

        done();
      });
    });

    afterEach(function() {
      if (!createInfo)
        return;
      chrome.socket.disconnect(createInfo.socketId);
      chrome.socket.destroy(createInfo.socketId);
      createInfo = null;
    });


    itWaitsForDone('port is available (sanity test)', function(done) {
      chrome.socket.listen(createInfo.socketId, addr, port, function(listenResult) {
        expect(listenResult).toEqual(0);
        done();
      });
    });

    itWaitsForDone('accept connect read write', function(done) {
      chrome.socket.listen(createInfo.socketId, addr, port, function(listenResult) {
        expect(listenResult).toEqual(0);

        chrome.socket.accept(createInfo.socketId, function(acceptInfo) {
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

            done();
          });
        });

        chrome.socket.create('tcp', function(createInfo2) {
          expect(createInfo2).toBeTruthy();
          expect(createInfo2.socketId).toBeDefined();

          chrome.socket.connect(createInfo2.socketId, addr, port, function(connectResult) {
            expect(connectResult).toEqual(0);

            chrome.socket.write(createInfo2.socketId, data, function(writeResult) {
              expect(writeResult.bytesWritten).toBeGreaterThan(0);

              chrome.socket.disconnect(createInfo2.socketId);
              chrome.socket.destroy(createInfo2.socketId);
            });
          });
        });
      });
    });

    itWaitsForDone('connect before accept', function(done) {
      chrome.socket.listen(createInfo.socketId, addr, port, function(listenResult) {
        expect(listenResult).toEqual(0);

        chrome.socket.create('tcp', function(createInfo2) {
          expect(createInfo2).toBeTruthy();
          expect(createInfo2.socketId).toBeDefined();

          chrome.socket.connect(createInfo2.socketId, addr, port, function(connectResult) {
            expect(connectResult).toEqual(0);

            chrome.socket.disconnect(createInfo2.socketId);
            chrome.socket.destroy(createInfo2.socketId);
          });

          setTimeout(function() {
            chrome.socket.accept(createInfo.socketId, function(acceptInfo) {
              expect(acceptInfo).toBeTruthy();
              expect(acceptInfo.resultCode).toEqual(0);
              expect(acceptInfo.socketId).toBeDefined();

              chrome.socket.disconnect(acceptInfo.socketId);
              chrome.socket.destroy(acceptInfo.socketId);

              done();
            });
          }, 100);
        });
      });
    });

    itWaitsForDone('getInfo works', function(done) {
      chrome.socket.getInfo(createInfo.socketId, function(socketInfo) {
        expect(socketInfo.socketType).toEqual('tcp');
        expect(socketInfo.connected).toBeFalsy();
        expect(socketInfo.localAddress).toBeFalsy();
        expect(socketInfo.localPort).toBeFalsy();
        expect(socketInfo.peerAddress).toBeFalsy();
        expect(socketInfo.peerPort).toBeFalsy();

        chrome.socket.listen(createInfo.socketId, addr, port, function(listenResult) {
          expect(listenResult).toEqual(0);

          chrome.socket.getInfo(createInfo.socketId, function(socketInfo) {
            expect(socketInfo.socketType).toEqual('tcp');
            expect(socketInfo.connected).toBeFalsy();
            expect(socketInfo.localAddress).toEqual(addr);
            expect(socketInfo.localPort).toEqual(port);
            expect(socketInfo.peerAddress).toBeFalsy();
            expect(socketInfo.peerPort).toBeFalsy();

            chrome.socket.accept(createInfo.socketId, function(acceptInfo) {
              expect(acceptInfo).toBeTruthy();
              expect(acceptInfo.resultCode).toEqual(0);
              expect(acceptInfo.socketId).toBeDefined();

              chrome.socket.getInfo(acceptInfo.socketId, function(socketInfo) {
                expect(socketInfo.socketType).toEqual('tcp');
                expect(socketInfo.connected).toBeTruthy();
                expect(socketInfo.localAddress).toEqual(addr);
                expect(socketInfo.localPort).toBeGreaterThan(0);
                expect(socketInfo.peerAddress).toEqual(addr);
                expect(socketInfo.peerPort).toBeGreaterThan(0);

                chrome.socket.read(acceptInfo.socketId, function(readResult) {
                  chrome.socket.disconnect(acceptInfo.socketId);
                  chrome.socket.destroy(acceptInfo.socketId);

                  done();
                });
              });
            });

            chrome.socket.create('tcp', function(createInfo2) {
              expect(createInfo2).toBeTruthy();
              expect(createInfo2.socketId).toBeDefined();

              chrome.socket.connect(createInfo2.socketId, addr, port, function(connectResult) {
                expect(connectResult).toEqual(0);

                chrome.socket.getInfo(createInfo2.socketId, function(socketInfo) {
                  expect(socketInfo.socketType).toEqual('tcp');
                  expect(socketInfo.connected).toBeTruthy();
                  expect(socketInfo.localAddress).toEqual(addr);
                  expect(socketInfo.localPort).toBeGreaterThan(0);
                  expect(socketInfo.peerAddress).toEqual(addr);
                  expect(socketInfo.peerPort).toBeGreaterThan(0);

                  chrome.socket.write(createInfo2.socketId, data, function(writeResult) {
                    chrome.socket.disconnect(createInfo2.socketId);
                    chrome.socket.destroy(createInfo2.socketId);
                  });
                });
              });
            });
          });
        });
      });
    });

  });

  describe('UDP', function() {
    var createInfo = null;

    beforeEachWaitsForDone(function(done) {
      chrome.socket.create('udp', function(ci) {
        createInfo = ci;

        expect(createInfo).toBeTruthy();
        expect(createInfo.socketId).toBeDefined();

        done();
      });
    });

    afterEach(function() {
      if (!createInfo)
        return;
      chrome.socket.disconnect(createInfo.socketId);
      chrome.socket.destroy(createInfo.socketId);
      createInfo = null;
    });


    itWaitsForDone('port is available (sanity test)', function(done) {
      chrome.socket.bind(createInfo.socketId, addr, port, function(bindResult) {
        expect(bindResult).toEqual(0);
        done();
      });
    });

    itWaitsForDone('bind to port 0 works', function(done) {
      chrome.socket.bind(createInfo.socketId, addr, 0, function(bindResult) {
        expect(bindResult).toEqual(0);
        done();
      });
    });

    itWaitsForDone('bind to addr 0.0.0.0 works', function(done) {
      chrome.socket.bind(createInfo.socketId, '0.0.0.0', 0, function(bindResult) {
        expect(bindResult).toEqual(0);
        done();
      });
    });

    itWaitsForDone('getInfo works', function(done) {
      chrome.socket.bind(createInfo.socketId, addr, port, function(bindResult) {
        expect(bindResult).toEqual(0);

        chrome.socket.getInfo(createInfo.socketId, function(socketInfo) {
          expect(socketInfo.socketType).toEqual('udp');
          expect(socketInfo.connected).toBeFalsy();
          expect(socketInfo.peerAddress).toBeFalsy();
          expect(socketInfo.peerPort).toBeFalsy();
          expect(socketInfo.localAddress).toBeTruthy();
          expect(socketInfo.localPort).toBeTruthy();

          done();
        });
      });
    });

    itWaitsForDone('bind recvFrom sendTo with reply', function(done) {
      chrome.socket.bind(createInfo.socketId, addr, port, function(bindResult) {
        expect(bindResult).toEqual(0);

        chrome.socket.recvFrom(createInfo.socketId, function(readResult) {
          expect(readResult).toBeTruthy();
          expect(readResult.resultCode).toBeGreaterThan(0);
          expect(readResult.data).toBeDefined();
          expect(readResult.address).toBeDefined();
          expect(readResult.port).toBeDefined();

          expect(Object.prototype.toString.call(data).slice(8,-1)).toEqual('ArrayBuffer');
          expect(Object.prototype.toString.call(readResult.data).slice(8,-1)).toEqual('ArrayBuffer');

          var sent = new Uint8Array(data);
          var recv = new Uint8Array(readResult.data);

          expect(recv.length).toEqual(sent.length);
          for (var i = 0; i < recv.length; i++) {
            expect(recv[i]).toEqual(sent[i]);
          }

          chrome.socket.sendTo(createInfo.socketId, data, readResult.address, readResult.port, function(writeResult) {
            expect(writeResult).toBeTruthy();
            expect(writeResult.bytesWritten).toBeGreaterThan(0);
          });
        });

        chrome.socket.create('udp', function(createInfo2) {
          expect(createInfo2).toBeTruthy();
          expect(createInfo2.socketId).toBeDefined();

          chrome.socket.bind(createInfo2.socketId, addr, port+1, function(bindResult) {
            expect(bindResult).toEqual(0);

            chrome.socket.sendTo(createInfo2.socketId, data, addr, port, function(writeResult) {
              expect(writeResult).toBeTruthy();
              expect(writeResult.bytesWritten).toBeGreaterThan(0);

              chrome.socket.recvFrom(createInfo2.socketId, function(readResult) {
                chrome.socket.destroy(createInfo2.socketId);

                done();
              });
            });
          });
        });
      });
    });


    itWaitsForDone('bind connect x2 read write', function(done) {
      chrome.socket.create('udp', function(createInfo2) {
        expect(createInfo2).toBeTruthy();
        expect(createInfo2.socketId).toBeDefined();

        chrome.socket.bind(createInfo.socketId, addr, port, function(bindResult1) {
          expect(bindResult1).toEqual(0);

          chrome.socket.bind(createInfo2.socketId, addr, port+1, function(bindResult2) {
            expect(bindResult2).toEqual(0);

            chrome.socket.connect(createInfo.socketId, addr, port+1, function(connectResult1) {
              expect(connectResult1).toEqual(0);

              chrome.socket.connect(createInfo2.socketId, addr, port, function(connectResult2) {
                expect(connectResult2).toEqual(0);

                chrome.socket.read(createInfo.socketId, function(readResult) {
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

                  chrome.socket.disconnect(createInfo2.socketId);
                  chrome.socket.destroy(createInfo2.socketId);
                  done();
                });

                chrome.socket.write(createInfo2.socketId, data, function(writeResult) {
                  expect(writeResult).toBeTruthy();
                  expect(writeResult.bytesWritten).toBeGreaterThan(0);
                });
              });
            });
          });
        });
      });
    });
  });
});
