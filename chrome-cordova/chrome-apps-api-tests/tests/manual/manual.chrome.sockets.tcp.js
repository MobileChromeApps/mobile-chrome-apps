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
    if (info.data) {
      var message = String.fromCharCode.apply(null, new Uint8Array(info.data));
      logger(message);
    }
    chrome.sockets.tcp.disconnect(info.socketId);
    chrome.sockets.tcp.close(info.socketId);

    if (info.uri) {
      window.resolveLocalFileSystemURL(info.uri, function(fe) {
        fe.file(function(file) {
          var reader = new FileReader();
          reader.onloadend = function(e) {
            logger('Onload End');
            logger(e);
            logger('result is ' + this.result);
          };

          reader.readAsText(file);
        });
      }, logger);
    }
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

  function stringToArrayBuffer(string) {
    var buf = new ArrayBuffer(string.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = string.length; i < strLen; i++) {
      bufView[i] = string.charCodeAt(i);
    }
    return buf;
  }

  function redirectToFile(append) {
    var hostname = 'httpbin.org';
    var requestString = 'GET /get HTTP/1.1\r\nHOST: ' + hostname + '\r\n\r\n';
    var message = stringToArrayBuffer(requestString);

    var options = {
      uri: cordova.file.applicationStorageDirectory + 'Documents/redirectToFile.txt',
      append: append,
      numBytes: 15
    };

    logger(options);

    chrome.sockets.tcp.create(function(createInfo) {

      chrome.sockets.tcp.pipeToFile(createInfo.socketId, options, function() {
        logger('file redirection is done');
      });

      chrome.sockets.tcp.connect(createInfo.socketId, hostname, 80, function(result) {
        if (result === 0) {
          chrome.sockets.tcp.send(createInfo.socketId, message, function(result) {
            logger('send result: ' + result);
          });
        }
      });
    });
  }

  function connectSecureAndSend() {
    var hostname = 'httpbin.org';
    var requestString = 'GET /get HTTP/1.1\r\nHOST: ' + hostname + '\r\n\r\n';
    var message = stringToArrayBuffer(requestString);

    chrome.sockets.tcp.create(function(createInfo) {
      // Set paused to true to prevent read consume TLS handshake data, native
      // readling loop will not pause/abort pending read when set paused after a
      // connection has established.
      chrome.sockets.tcp.setPaused(createInfo.socketId, true, function() {
        chrome.sockets.tcp.connect(createInfo.socketId, hostname, 443, function(result) {
          if (result === 0) {
            chrome.sockets.tcp.secure(createInfo.socketId, {tlsVersion: {min: 'ssl3', max: 'tls1.2'}}, function(result) {
              if (result !== 0) {
                logger('secure connection failed: ' + result);
              }

              chrome.sockets.tcp.setPaused(createInfo.socketId, false, function() {
                // Test secure send multiple times to ensure that buffer in Android is manipulated correctly.
                for (var i = 0; i < 3; i++) {
                  (function(i) {
                    chrome.sockets.tcp.send(createInfo.socketId, message, function(result) {
                      if (result.resultCode === 0) {
                        logger('connectSecureAndSend: success ' + i);
                      }
                    });
                  })(i);
                }

              });
            });
          }
        });
      });
    });
  }

  // This method should fail on iOS and Desktop.
  function simpleStartTLS() {

    var startTLSReceiver = function(info) {
      var message = String.fromCharCode.apply(null, new Uint8Array(info.data));
      if (message.indexOf('Ready to start TLS' > -1)) {
        chrome.sockets.tcp.secure(info.socketId, function(result) {
          logger('secure result:' + result);
          chrome.sockets.tcp.onReceive.removeListener(startTLSReceiver);
        });
      }
    }

    chrome.sockets.tcp.onReceive.addListener(startTLSReceiver);

    var addr = 'smtp.gmail.com';
    var port = 25;
    var command = stringToArrayBuffer('HELO me.com\r\nSTARTTLS\r\n');

    chrome.sockets.tcp.create(function(createInfo) {
      chrome.sockets.tcp.connect(createInfo.socketId, addr, port, function(result) {
        chrome.sockets.tcp.send(createInfo.socketId, command, function(result) {
          if (result === 0) {
            logger('send command success');
          }
        });
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

    addButton('TCP: test redirect to file with append', function() {
      redirectToFile(true);
    });

    addButton('TCP: test redirect to file without append', function() {
      redirectToFile(false);
    });

    addButton('TCP: connect & secure & send', function() {
      connectSecureAndSend();
    });

    addButton('TCP: test startTLS', function() {
      simpleStartTLS();
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
