// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.sockets.tcpServer', function(rootEl, addButton) {
  var addr = '127.0.0.1';
  var port = 12345;

  var arr = new Uint8Array(256)
  for (var i = 0; i < arr.length; i++) {
    arr[i] = i;
  }

  function acceptErrorListener(info) {
    logger('AcceptError on socket: ' + info.socketId);
    logger(info);
    chrome.sockets.tcpServer.disconnect(info.socketId);
    chrome.sockets.tcpServer.close(info.socketId);
  }

  function acceptListener(info) {
    logger('Accepted on socket: ' + info.socketId);
    logger(info);
    chrome.sockets.tcp.setPaused(info.clientSocketId, false, function() {
      chrome.sockets.tcp.send(info.clientSocketId, arr.buffer, function(result) {
        if (result.resultCode === 0) {
          logger('TCP send: success');
        }
      });
    });
  }

  function receiveErrorListener(info) {
    logger('Server RecvError on socket: ' + info.socketId);
    logger(info);
    chrome.sockets.tcp.disconnect(info.socketId);
    chrome.sockets.tcp.close(info.socketId);
  }

  function receiveListener(info) {
    logger('Server Recv: success');
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

  function addAcceptListeners() {
    chrome.sockets.tcpServer.onAcceptError.addListener(acceptErrorListener);
    chrome.sockets.tcpServer.onAccept.addListener(acceptListener);
  }

  function removeAcceptListeners() {
    chrome.sockets.tcpServer.onAcceptError.removeListener(acceptErrorListener);
    chrome.sockets.tcpServer.onAccept.removeListener(acceptListener);
  }

  function listen() {
    chrome.sockets.tcpServer.create(function(createInfo) {
      chrome.sockets.tcpServer.listen(createInfo.socketId, addr, port, /** backlog */ function(result){
        if (result === 0) {
          logger('socket is listenning');
        }
      });
    });
  }

  function updateSocket() {
    chrome.sockets.tcpServer.create({}, function(createInfo) {
      updatedProperties = {
        persistent: true,
        name: 'testUpdate',
      };

      chrome.sockets.tcpServer.update(createInfo.socketId, updatedProperties);

      chrome.sockets.tcpServer.getInfo(createInfo.socketId, function(socketInfo) {
        logger(socketInfo);
      });
    });
  }

  function getSockets() {
    chrome.sockets.tcpServer.getSockets(function(socketsInfo) {
      logger('Get Tcp Server Sockets');
      if (!socketsInfo) return;
      for (var i = 0; i < socketsInfo.length; i++) {
        logger(socketsInfo[i]);
      }
    });

    chrome.sockets.tcp.getSockets(function(socketsInfo) {
      logger('Get Tcp Sockets');
      if (!socketsInfo) return;
      for (var i = 0; i < socketsInfo.length; i++) {
        logger(socketsInfo[i]);
      }
    });
  }

  function closeSockets() {
    chrome.sockets.tcpServer.getSockets(function(socketsInfo) {
      if (!socketsInfo) return;
      for (var i = 0; i < socketsInfo.length; i++) {
        logger('closing server socket: ' + socketsInfo[i].socketId);
        chrome.sockets.tcpServer.close(socketsInfo[i].socketId);
      }
    });
  }

  function initPage() {

    addButton('add TCP client recieve listeners', function() {
      addReceiveListeners();
    });

    addButton('remove TCP recieve listeners', function() {
      removeReceiveListeners();
    });

    addButton('add accept listeners', function() {
      addAcceptListeners();
    });

    addButton('remove accept listeners', function() {
      removeAcceptListeners();
    });

    addButton('TCP - SERVER: Listen', function() {
      listen();
    });

    addButton('TCP - SERVER: Update socket', function() {
      updateSocket();
    });

    addButton('TCP - SERVER: Get sockets', function() {
      getSockets();
    });

    addButton('TCP - SERVER: Close sockets', function() {
      closeSockets();
    });
  }

  initPage();
});
