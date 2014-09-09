// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.sockets.udp', function(rootEl, addButton) {

  function sendTo(data, addr, port) {
    chrome.sockets.udp.create(function(createInfo) {
      chrome.sockets.udp.bind(createInfo.socketId, '0.0.0.0', 0, function(result) {
        chrome.sockets.udp.send(createInfo.socketId, data, addr, port, function(result) {
          if (result < 0) {
            logger('send fail: ' + result);
            chrome.sockets.udp.close(createInfo.socketId);
          } else {
            logger('sendTo: success ' + port);
            chrome.sockets.udp.close(createInfo.socketId);
          }
        });
      });
    });
  }

  function receiveErrorListener(info) {
    logger('RecvError on socket: ' + info.socketId);
    logger(info);
    chrome.sockets.udp.close(info.socketId);
  }

  function receiveListener(info) {
    logger('Recv: success Data: ' +
           String.fromCharCode.apply(null, new Uint16Array(info.data)));
    logger(info);
    chrome.sockets.udp.close(info.socketId);
  }

  function addReceiveListeners() {
    chrome.sockets.udp.onReceiveError.addListener(receiveErrorListener);
    chrome.sockets.udp.onReceive.addListener(receiveListener);
  }

  function removeReceiveListeners() {
    chrome.sockets.udp.onReceiveError.removeListener(receiveErrorListener);
    chrome.sockets.udp.onReceive.removeListener(receiveListener);
  }

  function bindRecvFromSendTo(data) {
    chrome.sockets.udp.create(function(createInfo) {
      chrome.sockets.udp.bind(createInfo.socketId, '0.0.0.0', 0, function(result) {
        chrome.sockets.udp.getInfo(createInfo.socketId, function(socketInfo) {
          sendTo(data, socketInfo.localAddress, socketInfo.localPort);
        });
      });
    });
  }

  function bindRecvFromSendToWithTinyBuffer(data) {
    chrome.sockets.udp.create({bufferSize:8}, function(createInfo) {
      chrome.sockets.udp.bind(createInfo.socketId, '0.0.0.0', 0, function(result) {
        chrome.sockets.udp.getInfo(createInfo.socketId, function(socketInfo) {
          sendTo(data, socketInfo.localAddress, socketInfo.localPort);
        });
      });
    });
  }

  function pauseBindRecvFromSendTo(data) {
    chrome.sockets.udp.create(function(createInfo) {
      chrome.sockets.udp.setPaused(createInfo.socketId, true, function() {
        chrome.sockets.udp.bind(createInfo.socketId, '0.0.0.0', 0, function(result) {
          chrome.sockets.udp.getInfo(createInfo.socketId, function(socketInfo) {
            sendTo(data, socketInfo.localAddress, socketInfo.localPort);
          });
        });
      });
    });
  }

  function bindPauseRecvFromSendTo(data) {
    chrome.sockets.udp.create(function(createInfo) {
      chrome.sockets.udp.bind(createInfo.socketId, '0.0.0.0', 0, function(result) {
        chrome.sockets.udp.setPaused(createInfo.socketId, true, function() {
          chrome.sockets.udp.getInfo(createInfo.socketId, function(socketInfo) {
            sendTo(data, socketInfo.localAddress, socketInfo.localPort);
          });
        });
      });
    });
  }

  function stringToArrayBuffer(string) {
    // UTF-16LE
    var buf = new ArrayBuffer(string.length * 2);
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = string.length; i < strLen; i++) {
      bufView[i] = string.charCodeAt(i);
    }
    return buf;
  }

  function joinMulticastGroup(address, loopback) {
    chrome.sockets.udp.create({bufferSize:1048576},function (socket) {
      var socketId = socket.socketId;
      logger(socket);
      chrome.sockets.udp.setMulticastTimeToLive(socketId, 12, function (result) {
        if (result != 0) {
          logger("Set TTL Error: " + result);
        }
        chrome.sockets.udp.setMulticastLoopbackMode(socketId, loopback, function (result) {
          if (result != 0) {
            logger("Set Multicast LoopbackMode" + result);
          }
          chrome.sockets.udp.bind(socketId, "0.0.0.0", 0, function (result) {
            if (result != 0) {
              chrome.sockets.udp.close(socketId);
              logger("Error on bind(): " + result);
            } else {
              chrome.sockets.udp.joinGroup(socketId, address, function (result) {
                if (result != 0) {
                  chrome.sockets.udp.close(socketId);
                  logger("Error on joinGroup(): " + result);
                } else {
                  chrome.sockets.udp.getInfo(socketId, function(socketInfo) {
                    message = stringToArrayBuffer(socketId + ' Joined Group');
                    chrome.sockets.udp.send(
                      socketId, message, address, socketInfo.localPort, function (result) {
                      if (result < 0) {
                        logger('send fail: ' + result);
                      } else {
                        logger('group sendTo: success');
                      }
                    });
                  });
                }
              });
            }
          });
        });
      });
    });
  }

  function getSockets() {
    chrome.sockets.udp.getSockets(function(socketsInfo) {
      if (!socketsInfo) return;
      for (var i = 0; i < socketsInfo.length; i++) {
        logger(socketsInfo[i]);
      }
    });
  }

  function updateSocket() {
    chrome.sockets.udp.create({}, function(createInfo) {
      updatedProperties = {
        persistent: true,
        name: 'testUpdate',
        bufferSize: 2048
      };
      chrome.sockets.udp.update(createInfo.socketId, updatedProperties);

      chrome.sockets.udp.getInfo(createInfo.socketId, function(socketInfo) {
        logger(socketInfo);
      });
    });
  }

  function setPaused() {
    chrome.sockets.udp.create({}, function(createInfo) {
      chrome.sockets.udp.setPaused(createInfo.socketId, true);
      chrome.sockets.udp.getInfo(createInfo.socketId, function(socketInfo) {
        logger(socketInfo);
      });
    });
  }

  function closeSockets() {
    chrome.sockets.udp.getSockets(function(socketsInfo) {
      if (!socketsInfo) return;
      for (var i = 0; i < socketsInfo.length; i++) {
        logger('closing socket: ' + socketsInfo[i].socketId);
        chrome.sockets.udp.close(socketsInfo[i].socketId);
      }
    });
  }

  function initPage() {

    var defaultAddr = '127.0.0.1';
    var defaultPort = 1234;
    var multicastAddr = '224.0.0.1';

    var arr = new Uint8Array(256);
    for (var i = 0; i < arr.length; i++) {
      arr[i] = i;
    }

    addButton('send', function() {
      sendTo(arr.buffer, defaultAddr, defaultPort);
    });

    addButton('add receive listeners', function() {
      addReceiveListeners();
    });

    addButton('remove receive listeners', function() {
      removeReceiveListeners();
    });

    addButton('send to a bind socket', function() {
      bindRecvFromSendTo(arr.buffer);
    });

    addButton('send to a tiny buffer bind socket', function() {
      bindRecvFromSendToWithTinyBuffer(arr.buffer);
    });

    addButton('get sockets', function() {
      getSockets();
    });

    addButton('update socket', function() {
      updateSocket();
    });

    addButton('set paused', function() {
      setPaused();
    });

    addButton('send to a paused socket', function() {
      pauseBindRecvFromSendTo(arr.buffer);
      bindPauseRecvFromSendTo(arr.buffer);
    });

    addButton('close sockets', function() {
      closeSockets();
    });

    addButton('Join multicast group', function() {
      joinMulticastGroup(multicastAddr, false);
    });

    addButton('Join multicast group with loopback', function() {
      joinMulticastGroup(multicastAddr, true);
    });
  }

  initPage();

});
