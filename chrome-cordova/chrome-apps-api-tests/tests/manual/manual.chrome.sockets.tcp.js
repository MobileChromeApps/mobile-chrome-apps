// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.sockets.tcp', function(rootEl, addButton) {
  var addr = '127.0.0.1';
  var port = 12345;

  function receiveErrorListener(info) {
    logger('Client RecvError on socket: ' + info.socketId);
    logger(info);
    chrome.sockets.tcp.disconnect(info.socketId);
    chrome.sockets.tcp.close(info.socketId);
  }

  function receiveListener(info) {
    logger('Client Recv: success');
    logger(info);
    chrome.sockets.tcp.disconnect(info.socketId);
    chrome.sockets.tcp.close(info.socketId);
  }

  function addReceiveListeners() {
    chrome.sockets.tcp.onReceiveError.addListener(receiveErrorListener);
    chrome.sockets.tcp.onReceive.addListener(receiveListener);
  }

  function removeReceiveListeners() {
    chrome.sockets.tcp.onReceiveError.removeListener(receiveErrorListener);
    chrome.sockets.tcp.onReceive.removeListener(receiveListener);
  }

  function connect() {
    chrome.sockets.tcp.create(function(createInfo) {
      chrome.sockets.tcp.connect(createInfo.socketId, addr, port, function(result) {
        if (result === 0) {
          logger('connect: success');
        }
      });
    });
  }

  function connectAndPause() {
    chrome.sockets.tcp.create(function(createInfo) {
      logger('create socket: ' + createInfo.socketId);
      chrome.sockets.tcp.connect(createInfo.socketId, addr, port, function(result) {
        if (result === 0) {
          logger('connect: success');
          chrome.sockets.tcp.setPaused(createInfo.socketId, true, function() {
            logger('paused');
          });
        }
      });
    });
  }

  function connectAndSend(data) {
    chrome.sockets.tcp.create(function(createInfo) {
      chrome.sockets.tcp.connect(createInfo.socketId, addr, port, function(result) {
        if (result === 0) {
          chrome.sockets.tcp.send(createInfo.socketId, data, function(result) {
            if (result.resultCode === 0) {
              logger('connectAndSend: success');
              chrome.sockets.tcp.disconnect(createInfo.socketId);
              chrome.sockets.tcp.close(createInfo.socketId);
            }
          });
        }
      });
    });
  }

  function send(data) {
    chrome.sockets.tcp.create(function(createInfo) {
      chrome.sockets.tcp.send(createInfo.socketId, data, function(result) {
        if (result.resultCode === 0) {
          logger('send: success');
          chrome.sockets.tcp.close(createInfo.socketId);
        } else {
          logger('send error: ' + result.resultCode);
        }
      });
    });
  }

  function disconnectAndSend(data) {
    chrome.sockets.tcp.create(function(createInfo) {
      chrome.sockets.tcp.disconnect(createInfo.socketId, function() {
        chrome.sockets.tcp.send(createInfo.socketId, data, function(result) {
          if (result.resultCode === 0) {
            logger('send: success');
            chrome.sockets.tcp.close(createInfo.socketId);
          } else {
            logger('send error: ' + result.resultCode);
          }
        });
      });
    });
  }

  function getSockets() {
    chrome.sockets.tcp.getSockets(function(socketsInfo) {
      if (!socketsInfo) return;
      for (var i = 0; i < socketsInfo.length; i++) {
        logger(socketsInfo[i]);
      }
    });
  }

  function updateSocket() {
    chrome.sockets.tcp.create({}, function(createInfo) {
      updatedProperties = {
        persistent: true,
        name: 'testUpdate',
        bufferSize: 2048
      };

      chrome.sockets.tcp.update(createInfo.socketId, updatedProperties);

      chrome.sockets.tcp.getInfo(createInfo.socketId, function(socketInfo) {
        logger(socketInfo);
      });

    });
  }

  function closeSockets() {
    chrome.sockets.tcp.getSockets(function(socketsInfo) {
      if (!socketsInfo) return;
      for (var i = 0; i < socketsInfo.length; i++) {
        logger('closing socket: ' + socketsInfo[i].socketId);
        chrome.sockets.tcp.close(socketsInfo[i].socketId);
      }
    });
  }

  function initPage() {
    logger('Run this in terminal:');
    logger('while true; do');
    logger('  (nc -lv 12345 | xxd) || break; echo;');
    logger('done');

    var arr = new Uint8Array(256);
    for (var i = 0; i < arr.length; i++) {
      arr[i] = i;
    }

    addButton('add receive listeners', function() {
      addReceiveListeners();
    });

    addButton('remove receive listeners', function() {
      removeReceiveListeners();
    });

    addButton('TCP: connect', function() {
      connect();
    });

    addButton('TCP: connect & paused', function() {
      connectAndPause();
    });

    addButton('TCP: connect & send', function() {
      connectAndSend(arr.buffer);
    });

    addButton('TCP: send to unconnected', function() {
      send(arr.buffer);
    });

    addButton('TCP: unconnected & send', function() {
      disconnectAndSend(arr.buffer);
    });

    addButton('TCP: update socket', function() {
      updateSocket();
    });

    addButton('TCP: get sockets', function() {
      getSockets();
    });

    addButton('TCP: close sockets', function() {
      closeSockets();
    });

  }

  initPage();
});
