// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests('chrome.sockets.tcp and chrome.sockets.tcpServer', function() {
  'use strict';
  // constants
  var bindAddr = '0.0.0.0';
  var connectAddr = '127.0.0.1';
  var serverPort = Math.floor(Math.random() * (65535-1024)) + 1024; // random in 1024 -> 65535
  var arr = new Uint8Array(256);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = i;
  }
  var data = arr.buffer;

  // Socket management -- Make sure we clean up sockets after each test, even upon failure
  var clientSockets = [];
  var serverSockets = [];

  function createSocket(properties, callback) {
    if (typeof properties == 'function') {
      callback = properties;
      properties = {};
    }
    chrome.sockets.tcp.create(properties, function(clientCreateInfo) {
      expect(clientCreateInfo).toBeTruthy();
      expect(clientCreateInfo.socketId).toBeDefined();
      clientSockets.push(clientCreateInfo);
      chrome.sockets.tcpServer.create(properties, function(serverCreateInfo) {
        expect(serverCreateInfo).toBeTruthy();
        expect(serverCreateInfo.socketId).toBeDefined();
        serverSockets.push(serverCreateInfo);
        callback();
      });
    });
  }

  function createSockets(count, callback) {
    if (!count)
      return setTimeout(callback, 0);
    createSocket(createSockets.bind(null, count-1, callback));
  }

  beforeEach(function() {
    var customMatchers = {
      toBeValidTcpReadResultEqualTo: function(util, customEqualityTesters) {
        return {
          compare: function(actual, expected) {
            if (Object.prototype.toString.call(expected).slice(8, -1) !== "ArrayBuffer")
              throw new Error("toBeValidTcpReadResultEqualTo expects an ArrayBuffer");
            var result = { pass: true };
            if (!actual) result.pass = false;
            if (!actual.data) result.pass = false;
            if (Object.prototype.toString.call(actual.data).slice(8, -1) !== "ArrayBuffer") result.pass = false;

            var sent = new Uint8Array(expected);
            var recv = new Uint8Array(actual.data);
            if (recv.length !== sent.length) result.pass = false;

            for (var i = 0; i < recv.length; i++) {
              if (recv[i] !== sent[i]) result.pass = false;
            }
            return result;
          }
        };
      }
    };

    addMatchers(customMatchers);
  });

  beforeEach(function(done) {
    createSockets(1, done);
  });

  afterEach(function() {
    clientSockets.forEach(function(createInfo) {
      chrome.sockets.tcp.disconnect(createInfo.socketId);
      chrome.sockets.tcp.close(createInfo.socketId);
    });
    clientSockets = [];

    serverSockets.forEach(function(createInfo) {
      chrome.sockets.tcpServer.disconnect(createInfo.socketId);
      chrome.sockets.tcpServer.close(createInfo.socketId);
    });
    serverSockets = [];
  });

  it('should contain definitions', function() {
    expect(chrome.sockets.tcp.create).toBeDefined();
    expect(chrome.sockets.tcp.update).toBeDefined();
    expect(chrome.sockets.tcp.setPaused).toBeDefined();
    expect(chrome.sockets.tcp.setKeepAlive).toBeDefined();
    expect(chrome.sockets.tcp.setNoDelay).toBeDefined();
    expect(chrome.sockets.tcp.connect).toBeDefined();
    expect(chrome.sockets.tcp.disconnect).toBeDefined();
    expect(chrome.sockets.tcp.secure).toBeDefined();
    expect(chrome.sockets.tcp.send).toBeDefined();
    expect(chrome.sockets.tcp.close).toBeDefined();
    expect(chrome.sockets.tcp.getInfo).toBeDefined();
    expect(chrome.sockets.tcp.getSockets).toBeDefined();

    expect(chrome.sockets.tcpServer.create).toBeDefined();
    expect(chrome.sockets.tcpServer.update).toBeDefined();
    expect(chrome.sockets.tcpServer.setPaused).toBeDefined();
    expect(chrome.sockets.tcpServer.listen).toBeDefined();
    expect(chrome.sockets.tcpServer.disconnect).toBeDefined();
    expect(chrome.sockets.tcpServer.close).toBeDefined();
    expect(chrome.sockets.tcpServer.getInfo).toBeDefined();
    expect(chrome.sockets.tcpServer.getSockets).toBeDefined();
  });

  describe('TCP and TCPServer', function() {

    it('port is available (sanity test)', function(done) {
      chrome.sockets.tcpServer.listen(serverSockets[0].socketId, bindAddr, serverPort, function(listenResult) {
        expect(listenResult).toEqual(0);
        done();
      });
    });

    it('TCP connect to TCPServer', function(done) {
      chrome.sockets.tcpServer.listen(serverSockets[0].socketId, bindAddr, serverPort, function(listenResult) {
        expect(listenResult).toEqual(0);
        chrome.sockets.tcp.connect(clientSockets[0].socketId, connectAddr, serverPort, function(connectResult) {
          expect(connectResult).toEqual(0);
          done();
        });
      });
    });

    it('TCP getInfo works', function(done) {
      chrome.sockets.tcpServer.listen(serverSockets[0].socketId, bindAddr, serverPort, function(listenResult) {
        expect(listenResult).toEqual(0);
        chrome.sockets.tcp.connect(clientSockets[0].socketId, connectAddr, serverPort, function(connectResult) {
          expect(connectResult).toEqual(0);
          chrome.sockets.tcp.getInfo(clientSockets[0].socketId, function(socketInfo) {
            expect(socketInfo.socketId).toBeTruthy();
            expect(socketInfo.connected).toBe(true);
            expect(socketInfo.paused).toBe(false);
            expect(socketInfo.localAddress).toBeTruthy();
            expect(socketInfo.localPort).toBeTruthy();
            expect(socketInfo.peerAddress).toBeTruthy();
            expect(socketInfo.peerPort).toBeTruthy();
            done();
          });
        });
      });
    });

    it('TCPServer getInfo works', function(done) {
      chrome.sockets.tcpServer.listen(serverSockets[0].socketId, bindAddr, serverPort, function(listenResult) {
        expect(listenResult).toEqual(0);
        chrome.sockets.tcp.connect(clientSockets[0].socketId, connectAddr, serverPort, function(connectResult) {
          expect(connectResult).toEqual(0);
          chrome.sockets.tcpServer.getInfo(serverSockets[0].socketId, function(socketInfo) {
            expect(socketInfo.socketId).toBeTruthy();
            expect(socketInfo.paused).toBe(false);
            expect(socketInfo.localAddress).toBeTruthy();
            expect(socketInfo.localPort).toBeTruthy();
            done();
          });
        });
      });
    });

    it('update TCP socket', function(done) {
      var updatedProperties = {
        persistent: true,
        name: 'testUpdate',
        bufferSize: 2048
      };

      chrome.sockets.tcp.update(clientSockets[0].socketId, updatedProperties, function() {
        chrome.sockets.tcp.getInfo(clientSockets[0].socketId, function(socketInfo) {
          expect(socketInfo.persistent).toEqual(updatedProperties.persistent);
          expect(socketInfo.bufferSize).toEqual(updatedProperties.bufferSize);
          expect(socketInfo.name).toEqual(updatedProperties.name);
          done();
        });
      });
    });

    it('update TCPServer socket', function(done) {
      var updatedProperties = {
        persistent: true,
        name: 'testUpdate'
      };

      chrome.sockets.tcpServer.update(serverSockets[0].socketId, updatedProperties, function() {
        chrome.sockets.tcpServer.getInfo(serverSockets[0].socketId, function(socketInfo) {
          expect(socketInfo.persistent).toEqual(updatedProperties.persistent);
          expect(socketInfo.name).toEqual(updatedProperties.name);
          done();
        });
      });
    });

    it('TCP connect write', function(done) {
      var acceptListener = function(info) {
        expect(info.socketId).toEqual(serverSockets[0].socketId);
        expect(info.clientSocketId).toBeTruthy();
        chrome.sockets.tcp.setPaused(info.clientSocketId, false, function() {
          chrome.sockets.tcpServer.onAccept.removeListener(acceptListener);
        });
      };
      chrome.sockets.tcpServer.onAccept.addListener(acceptListener);

      var recvListener = function(info) {
        expect(info.socketId).not.toEqual(clientSockets[0].socketId);
        expect(info).toBeValidTcpReadResultEqualTo(data);
        chrome.sockets.tcp.onReceive.removeListener(recvListener);
        done();
      };
      chrome.sockets.tcp.onReceive.addListener(recvListener);

      chrome.sockets.tcpServer.listen(serverSockets[0].socketId, bindAddr, serverPort, function(listenResult) {
        expect(listenResult).toEqual(0);
        chrome.sockets.tcp.connect(clientSockets[0].socketId, connectAddr, serverPort, function(connectResult) {
          expect(connectResult).toEqual(0);
          chrome.sockets.tcp.send(clientSockets[0].socketId, data, function(result) {
            expect(result.resultCode).toEqual(0);
            expect(result.bytesSent).toEqual(256);
          });
        });
      });
    });

    it('TCPServer connect write', function(done) {
      var acceptListener = function(info) {
        expect(info.socketId).toEqual(serverSockets[0].socketId);
        expect(info.clientSocketId).toBeTruthy();
        chrome.sockets.tcp.send(info.clientSocketId, data, function(result) {
          expect(result.resultCode).toEqual(0);
          expect(result.bytesSent).toEqual(256);
          chrome.sockets.tcpServer.onAccept.removeListener(acceptListener);
        });
      };
      chrome.sockets.tcpServer.onAccept.addListener(acceptListener);

      var recvListener = function(info) {
        expect(info.socketId).toEqual(clientSockets[0].socketId);
        expect(info).toBeValidTcpReadResultEqualTo(data);
        chrome.sockets.tcp.onReceive.removeListener(recvListener);
        done();
      };
      chrome.sockets.tcp.onReceive.addListener(recvListener);

      chrome.sockets.tcpServer.listen(serverSockets[0].socketId, bindAddr, serverPort, function(listenResult) {
        expect(listenResult).toEqual(0);
        chrome.sockets.tcp.connect(clientSockets[0].socketId, connectAddr, serverPort, function(connectResult) {
          expect(connectResult).toEqual(0);
        });
      });
    });

    it('TCP secure get https website', function(done) {
      var hostname = 'www.httpbin.org';
      var port = 443;
      var requestString = 'GET /get HTTP/1.1\r\nHOST: ' + hostname + '\r\n\r\n';
      var request = new ArrayBuffer(requestString.length);
      var reqView = new Uint8Array(request);
      for (var i = 0, strLen = requestString.length; i < strLen; i++) {
        reqView[i] = requestString.charCodeAt(i);
      }

      var recvListener = function(info) {
        expect(info.socketId).toEqual(clientSockets[0].socketId);
        expect(info.data.byteLength).toBeGreaterThan(0);
        chrome.sockets.tcp.onReceive.removeListener(recvListener);
        done();
      };
      chrome.sockets.tcp.onReceive.addListener(recvListener);

      chrome.sockets.tcp.setPaused(clientSockets[0].socketId, true, function() {
        chrome.sockets.tcp.connect(clientSockets[0].socketId, hostname, port, function(connectResult) {
          expect(connectResult).toEqual(0);
          chrome.sockets.tcp.secure(clientSockets[0].socketId, function(secureResult) {
            expect(secureResult).toEqual(0);
            chrome.sockets.tcp.send(clientSockets[0].socketId, request, function(sendResult) {
              expect(sendResult.resultCode).toEqual(0);
              expect(sendResult.bytesSent).toEqual(requestString.length);
              chrome.sockets.tcp.setPaused(clientSockets[0].socketId, false);
            });
          });
        });
      });
    });

    it('TCP secure get https website three times', function(done) {
      var hostname = 'www.httpbin.org';
      var port = 443;
      var requestString = 'GET /get HTTP/1.1\r\nHOST: ' + hostname + '\r\n\r\n';
      var request = new ArrayBuffer(requestString.length);
      var reqView = new Uint8Array(request);
      var recvCounter = 0;
      for (var i = 0, strLen = requestString.length; i < strLen; i++) {
        reqView[i] = requestString.charCodeAt(i);
      }

      var recvListener = function(info) {
        recvCounter++;
        expect(info.socketId).toEqual(clientSockets[0].socketId);
        expect(info.data.byteLength).toBeGreaterThan(0);
        if (recvCounter == 3) {
          chrome.sockets.tcp.onReceive.removeListener(recvListener);
          done();
        }
      };
      chrome.sockets.tcp.onReceive.addListener(recvListener);

      chrome.sockets.tcp.setPaused(clientSockets[0].socketId, true, function() {
        chrome.sockets.tcp.connect(clientSockets[0].socketId, hostname, port, function(connectResult) {
          expect(connectResult).toEqual(0);
          chrome.sockets.tcp.secure(clientSockets[0].socketId, function(secureResult) {
            expect(secureResult).toEqual(0);
            for (var i = 0; i < 3; i++) {
              chrome.sockets.tcp.send(clientSockets[0].socketId, request, function(sendResult) {
                expect(sendResult.resultCode).toEqual(0);
                expect(sendResult.bytesSent).toEqual(requestString.length);
                chrome.sockets.tcp.setPaused(clientSockets[0].socketId, false);
              });
            }
          });
        });
      });
    });
  });

});
