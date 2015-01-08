// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.bluetoothSocket', function(rootEl, addButton) {

  var testAddress = 'B8:8D:12:25:39:BF';
  var testUuid = '00001101-0000-1000-8000-00805f9b34fb';
  var btDevice = null;
  var serverSocketId = null;
  var acceptedSocketId = null;
  var clientSocketId = null;

  function convertStringToArrayBuffer (str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0; i < str.length; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  addButton('Reset', function() {
    btDevice = null;
    serverSocketId = null;
    acceptedSocketId = null;
    clientSocketId = null;
  });

  addButton('Log bluetooth device', function() {
    logger(btDevice);
  });

  addButton('Add Events Listener', function() {
    chrome.bluetoothSocket.onReceive.addListener(function(info) {
      logger('onReceive: ');
      logger(info);
    });

    chrome.bluetoothSocket.onReceiveError.addListener(function(error) {
      logger('onReceiveError: ');
      logger(error);
    });

    chrome.bluetoothSocket.onAccept.addListener(function(info) {
      logger('onAccept: ');
      logger(info);
      acceptedSocketId = info.clientSocketId;

      // accetped sockets are paused by default.
      chrome.bluetoothSocket.setPaused(acceptedSocketId, false);
    });

    chrome.bluetoothSocket.onAcceptError.addListener(function(error) {
      logger('onAcceptError: ');
      logger(error);
    });
  });

  addButton('Find Bt Device by test uuid', function() {

    var isBtDevice = function(device) {
      if (device.uuids.indexOf(testUuid) !== -1) {
        logger('Find test bluetooth device');
        btDevice = device;
        return true;
      }
      return false;
    };

    var deviceAddedListener = function(device) {
      if (isBtDevice(device)) {
        chrome.bluetooth.stopDiscovery();
        chrome.bluetooth.onDeviceAdded.removeListener(deviceAddedListener);
      }
    };

    chrome.bluetooth.getDevices(function(devices) {
      devices.forEach(isBtDevice);
      if (btDevice === null) {
        chrome.bluetooth.onDeviceAdded.addListener(deviceAddedListener);
        chrome.bluetooth.startDiscovery();
      }
    });
  });

  addButton('Find Bt Device by Address', function() {
    var isBtDevice = function(device) {
      if (device.address === testAddress) {
        logger('Find test bluetooth device');
        btDevice = device;
        return true;
      }
      return false;
    };

    var deviceAddedListener = function(device) {
      if (isBtDevice(device)) {
        chrome.bluetooth.stopDiscovery();
        chrome.bluetooth.onDeviceAdded.removeListener(deviceAddedListener);
      }
    };

    chrome.bluetooth.getDevices(function(devices) {
      devices.forEach(isBtDevice);
      if (btDevice === null) {
        chrome.bluetooth.onDeviceAdded.addListener(deviceAddedListener);
        chrome.bluetooth.startDiscovery();
      }
    });
  });

  addButton('Rfcomm Listen', function() {
    chrome.bluetoothSocket.create(function(createInfo) {
      serverSocketId = createInfo.socketId;
      chrome.bluetoothSocket.listenUsingRfcomm(serverSocketId, testUuid, function() {
        logger('Bluetooth sockets listen using rfcomm success');
      });
    });
  });

  addButton('Connect', function() {
    chrome.bluetoothSocket.create(function(createInfo) {
      clientSocketId = createInfo.socketId;
      chrome.bluetoothSocket.connect(clientSocketId, btDevice.address, testUuid, function() {
        logger('Bluetooth sockets connect success');
      });
    });
  });

  addButton('Send Message From Connected Socket', function() {
    if (clientSocketId !== null) {
      chrome.bluetoothSocket.send(clientSocketId, convertStringToArrayBuffer('Client Test'), function(bytesSent) {
        logger('Bytes Send: ' + bytesSent);
      });
    }
  });

  addButton('Send Message From Accepted Socket', function() {
    if (acceptedSocketId !== null) {
      chrome.bluetoothSocket.send(acceptedSocketId, convertStringToArrayBuffer('Server Test'), function(bytesSent) {
        logger('Bytes Send: ' + bytesSent);
      });
    }
  });

  addButton('Log all sockets', function() {
    chrome.bluetoothSocket.getSockets(function(sockets) {
      logger(sockets);
    });
  });
});
