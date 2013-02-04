// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('chrome.socket', function(rootEl) {
  var addr = '127.0.0.1';
  var port = 1234;
  var log = chromespec.log;

  function connectAndWrite(type, data) {
    chrome.socket.create(type, {}, function(socketInfo) {
      chrome.socket.connect(socketInfo.socketId, addr, port, function(connectResult) {
        var connected = (connectResult === 0);
        if (connected) {
          chrome.socket.write(socketInfo.socketId, data, function(writeResult) {
            log('connectAndWrite: success');
            chrome.socket.disconnect(socketInfo.socketId);
            chrome.socket.destroy(socketInfo.socketId);
          });
        }
      });
    });
  }

  function connectAndRead(type) {
    chrome.socket.create(type, {}, function(socketInfo) {
      chrome.socket.connect(socketInfo.socketId, addr, port, function(connectResult) {
        var connected = (connectResult === 0);
        if (connected) {
          chrome.socket.read(socketInfo.socketId, function(readResult) {
            log('connectAndRead: success');
            chrome.socket.disconnect(socketInfo.socketId);
            chrome.socket.destroy(socketInfo.socketId);
          });
        }
      });
    });
  }

  function acceptAndWrite(type) {
  }

  function acceptAndRead(type) {
    chrome.socket.create(type, {}, function(socketInfo) {
      chrome.socket.listen(socketInfo.socketId, addr, port, function(listenResult) {
        chrome.socket.accept(socketInfo.socketId, function(acceptInfo) {
          chrome.socket.read(acceptInfo.socketId, function(readResult) {
            log('acceptAndRead: success');
            chrome.socket.disconnect(acceptInfo.socketId);
            chrome.socket.destroy(acceptInfo.socketId);
            chrome.socket.disconnect(socketInfo.socketId);
            chrome.socket.destroy(socketInfo.socketId);
          });
        });
      });
    });
  }

  function acceptConnectReadWrite(type, data) {
    chrome.socket.create(type, {}, function(socketInfo) {
      chrome.socket.listen(socketInfo.socketId, addr, port, function(listenResult) {

        chrome.socket.accept(socketInfo.socketId, function(acceptInfo) {
          chrome.socket.read(acceptInfo.socketId, function(readResult) {
            var sent = new Uint8Array(data);
            var recv = new Uint8Array(readResult.data);

            chrome.socket.disconnect(acceptInfo.socketId);
            chrome.socket.destroy(acceptInfo.socketId);
            chrome.socket.disconnect(socketInfo.socketId);
            chrome.socket.destroy(socketInfo.socketId);

            if (recv.length != sent.length) {
              return;
            }

            for (var i = 0; i < recv.length; i++) {
              if (recv[i] != sent[i]) {
                return;
              }
            }

            log('acceptConnectReadWrite: success');
          });
        });

        chrome.socket.create(type, {}, function(socketInfo) {
          chrome.socket.connect(socketInfo.socketId, addr, port, function(connectResult) {
            var connected = (connectResult === 0);
            if (connected) {
              chrome.socket.write(socketInfo.socketId, data, function(writeResult) {
                chrome.socket.disconnect(socketInfo.socketId);
                chrome.socket.destroy(socketInfo.socketId);
              });
            }
          });
        });
      });
    });
  }

  function sendTo(type, data) {
    chrome.socket.create(type, {}, function(socketInfo) {
      chrome.socket.sendTo(socketInfo.socketId, data, addr, port, function(result) {
        log('sendTo: success');
        chrome.socket.destroy(socketInfo.socketId);
      });
    });
  }

  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  function initPage() {
    log('Run this in terminal:');
    log('while true; do');
    log('  (nc -lv 1234 | xxd) || break; echo;');
    log('done');

    var arr = new Uint8Array(256);
    for (var i = 0; i<256; i++) {
      arr[i] = i;
    }

    addButton('TCP: connect & write', function() {
      connectAndWrite('tcp', arr.buffer);
    });

    addButton('TCP: connect & read', function() {
      connectAndRead('tcp');
    });

    addButton('TCP: accept & read', function() {
      acceptAndRead('tcp');
    });

    addButton('TCP: accept & connect & read & write', function() {
      acceptConnectReadWrite('tcp', arr.buffer);
    });


    addButton('UDP: connect & write', function() {
      connectAndWrite('udp', arr.buffer);
    });

    addButton('UDP: connect & read', function() {
      connectAndRead('udp', arr.buffer);
    });

    addButton('UDP: sendTo ArrayBuffer', function() {
      sendTo('udp', arr.buffer);
    });
  }

  initPage();
});
