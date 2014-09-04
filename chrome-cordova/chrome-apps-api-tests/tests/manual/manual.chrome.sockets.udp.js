// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.sockets.udp', function(rootEl, addButton) {

  function sendTo(data, addr, port) {
    chrome.sockets.udp.create(function(createInfo) {
      chrome.sockets.udp.bind(createInfo.socketId, addr, 0, function(result) {
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

    addButton('get sockets', function() {
      getSockets();
    });

    addButton('update socket', function() {
      updateSocket();
    });

    addButton('set paused', function() {
      setPaused();
    });

    addButton('close sockets', function() {
      closeSockets();
    });

  }

  initPage();

});
