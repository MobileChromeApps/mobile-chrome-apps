/**
 * Listens for the app launching then creates the window.
 * Ignores the provided window size.
 *
 * @see http://developer.chrome.com/trunk/apps/app.window.html
 */

var addr = '127.0.0.1';
var port = 1234;

function callbackAndThen(callback, args, andthen) {
  if (callback && typeof callback == 'function') {
    callback.apply(null, args.concat(andthen));
  } else {
    andthen();
  }
}

function createThenDestroy(callback) {
  chrome.socket.create('tcp', {}, function(socketInfo) {
    log('create: success');

    callbackAndThen(callback, [socketInfo], function() {
      chrome.socket.destroy(socketInfo.socketId);
      log('destroy: success');
    });
  });
}

function connectThenDisconnect(callback) {
  createThenDestroy(function(socketInfo, andthen) {
    chrome.socket.connect(socketInfo.socketId, addr, port, function(connectResult) {
      var connected = (connectResult === 0);
      log('connect: ' + (connected ? 'success' : 'failure'));
      if (connected) {
        callbackAndThen(callback, [socketInfo], function() {
          chrome.socket.disconnect(socketInfo.socketId);
          log('disconnect: success');
          andthen();
        });
      } else {
        andthen();
      }
    });
  });
}

function writeMessage(message) {
  connectThenDisconnect(function(socketInfo, andthen) {
    chrome.socket.write(socketInfo.socketId, message, function(result) {
      log('write: success');
      andthen();
    });
  });
}

function initPage() {
  log('Run this in terminal:');
  log('while true; do');
  log('  (nc -lv 1234 | xxd) || break;');
  log('  echo;');
  log('done');

  addActionButton('TCP: create & destroy', function() {
    log('Starting');
    createThenDestroy();
  });

  addActionButton('TCP: connect & disconnect', function() {
    log('Starting');
    connectThenDisconnect();
  });

  addActionButton('TCP: write hello', function() {
    log('Starting');
    writeMessage('hello');
  });

  addActionButton('TCP: write ArrayBuffer', function() {
    log('Starting');
    var arr = new Uint8Array(256);
    for (var i = 0; i<256; i++) {
      arr[i] = i;
    }
    writeMessage(arr.buffer);
  });

  addActionButton('TCP: read', function() {
  });
}

