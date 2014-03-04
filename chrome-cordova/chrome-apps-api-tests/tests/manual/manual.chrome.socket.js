// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.socket', function(rootEl, addButton) {
  var addr = '127.0.0.1';
  var port = 1234;

  function connectAndWrite(type, data) {
    chrome.socket.create(type, {}, function(socketInfo) {
      chrome.socket.connect(socketInfo.socketId, addr, port, function(connectResult) {
        var connected = (connectResult === 0);
        if (connected) {
          chrome.socket.write(socketInfo.socketId, data, function(writeResult) {
            logger('connectAndWrite: success');
            chrome.socket.disconnect(socketInfo.socketId);
            chrome.socket.destroy(socketInfo.socketId);
          });
        }
      });
    });
  }

  function connectAndRead(type, data) {
    chrome.socket.create(type, {}, function(socketInfo) {
      chrome.socket.connect(socketInfo.socketId, addr, port, function(connectResult) {
        var connected = (connectResult === 0);
        if (connected) {
          chrome.socket.write(socketInfo.socketId, data, function(writeResult) {
            chrome.socket.read(socketInfo.socketId, function(readResult) {
              logger('connectAndRead: success');
              chrome.socket.disconnect(socketInfo.socketId);
              chrome.socket.destroy(socketInfo.socketId);
            });
          });
        }
      });
    });
  }

  function acceptAndWrite() {
  }

  function acceptAndRead() {
    chrome.socket.create('tcp', {}, function(socketInfo) {
      chrome.socket.listen(socketInfo.socketId, addr, port, function(listenResult) {
        chrome.socket.accept(socketInfo.socketId, function(acceptInfo) {
          chrome.socket.read(acceptInfo.socketId, function(readResult) {
            logger('acceptAndRead: success');
            chrome.socket.disconnect(acceptInfo.socketId);
            chrome.socket.destroy(acceptInfo.socketId);
            chrome.socket.disconnect(socketInfo.socketId);
            chrome.socket.destroy(socketInfo.socketId);
          });
        });
      });
    });
  }

  function acceptConnectReadWrite(data) {
    chrome.socket.create('tcp', {}, function(socketInfo) {
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

            logger('acceptConnectReadWrite: success');
          });
        });

        chrome.socket.create('tcp', {}, function(socketInfo) {
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

  function acceptConnectReadWriteGetInfo(data) {
    chrome.socket.create('tcp', {}, function(socketInfo) {
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

            logger('acceptConnectReadWrite: success');
          });
        });

        chrome.socket.create('tcp', {}, function(socketInfo) {
          chrome.socket.connect(socketInfo.socketId, addr, port, function(connectResult) {
            var connected = (connectResult === 0);
            if (connected) {
              chrome.socket.getInfo(socketInfo.socketId, function(info) {
                if (info) {
                  logger(info.socketType + ': connected(' + info.connected + ') ' + (info.connected ? info.peerAddress + ':' + info.peerPort + ' -> ' + info.localAddress + ':' + info.localPort : ''));
                }

                chrome.socket.write(socketInfo.socketId, data, function(writeResult) {
                  chrome.socket.disconnect(socketInfo.socketId);
                  chrome.socket.destroy(socketInfo.socketId);
                });
              });
            }
          });
        });
      });
    });
  }

  function sendTo(data) {
    chrome.socket.create('udp', {}, function(socketInfo) {
      chrome.socket.sendTo(socketInfo.socketId, data, addr, port, function(result) {
        logger('sendTo: success');
        chrome.socket.destroy(socketInfo.socketId);
      });
    });
  }

  function bindAndRecvFrom(data) {
    chrome.socket.create('udp', {}, function(socketInfo) {
      chrome.socket.bind(socketInfo.socketId, addr, port, function(result) {
        chrome.socket.recvFrom(socketInfo.socketId, function(readResult) {
          logger('recvFrom: success');
          chrome.socket.destroy(socketInfo.socketId);
        });
      });
    });
  }

  function bindRecvFromSendTo(data) {
    chrome.socket.create('udp', {}, function(socketInfo) {
      chrome.socket.bind(socketInfo.socketId, addr, port, function(result) {
        chrome.socket.recvFrom(socketInfo.socketId, function(readResult) {
          var sent = new Uint8Array(data);
          var recv = new Uint8Array(readResult.data);

          if (recv.length != sent.length) {
            return;
          }

          for (var i = 0; i < recv.length; i++) {
            if (recv[i] != sent[i]) {
              return;
            }
          }

          logger('bindRecvFromSendTo: success');
          chrome.socket.destroy(socketInfo.socketId);
        });

        chrome.socket.create('udp', {}, function(socketInfo) {
          chrome.socket.sendTo(socketInfo.socketId, data, addr, port, function(result) {
            chrome.socket.destroy(socketInfo.socketId);
          });
        });
      });
    });
  }

  function bindConnectReadWrite(data) {
    chrome.socket.create('udp', {}, function(socketInfo1) {
      chrome.socket.bind(socketInfo1.socketId, addr, port, function(result) {

        chrome.socket.create('udp', {}, function(socketInfo2) {
          chrome.socket.bind(socketInfo2.socketId, addr, port+1, function(result) {

            chrome.socket.connect(socketInfo1.socketId, addr, port+1, function(result) {
              chrome.socket.connect(socketInfo2.socketId, addr, port, function(result) {

                chrome.socket.read(socketInfo1.socketId, function(readResult) {
                  var sent = new Uint8Array(data);
                  var recv = new Uint8Array(readResult.data);

                  if (recv.length != sent.length) {
                    return;
                  }

                  for (var i = 0; i < recv.length; i++) {
                    if (recv[i] != sent[i]) {
                      return;
                    }
                  }

                  logger('bindConnectReadWrite: success');
                  chrome.socket.destroy(socketInfo1.socketId);
                });

                chrome.socket.write(socketInfo2.socketId, data, function(result) {
                  chrome.socket.destroy(socketInfo2.socketId);
                });

              });
            });

          });
        });

      });
    });
  }

  function getNetworkList() {
    chrome.socket.getNetworkList(function(info) {
      if (!info) return;
      for (var i = 0; i < info.length; i++) {
        logger(info[i].name + ': ' + info[i].address);
      }
    });
  }

  function initPage() {
    logger('Run this in terminal:');
    logger('while true; do');
    logger('  (nc -lv 1234 | xxd) || break; echo;');
    logger('done');

    var arr = new Uint8Array(256);
    for (var i = 0; i < arr.length; i++) {
      arr[i] = i;
    }

    addButton('TCP: connect & write', function() {
      connectAndWrite('tcp', arr.buffer);
    });

    addButton('TCP: connect & read', function() {
      connectAndRead('tcp', arr.buffer);
    });

    addButton('TCP: accept & read', function() {
      acceptAndRead();
    });

    addButton('TCP: all-in-one', function() {
      acceptConnectReadWrite(arr.buffer);
    });

    addButton('TCP: all-in-one with getInfo', function() {
      acceptConnectReadWriteGetInfo(arr.buffer);
    });


    addButton('UDP: connect & write', function() {
      connectAndWrite('udp', arr.buffer);
    });

    addButton('UDP: connect & read', function() {
      connectAndRead('udp', arr.buffer);
    });

    addButton('UDP: sendTo', function() {
      sendTo(arr.buffer);
    });

    addButton('UDP: bind & recvFrom', function() {
      bindAndRecvFrom(arr.buffer);
    });

    addButton('UDP: all-in-one connectionless', function() {
      bindRecvFromSendTo(arr.buffer);
    });

    addButton('UDP: all-in-one w/ connections', function() {
      bindConnectReadWrite(arr.buffer);
    });

    addButton('getNetworkList', function() {
      getNetworkList();
    });
  }

  initPage();
});
