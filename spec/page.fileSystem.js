
chromespec.registerSubPage('chrome.fileSystem', function(rootEl) {
  var FileReader = cordova.require('cordova/plugin/FileReader');
  var FileTransfer = cordova.require('cordova/plugin/FileTransfer');

  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  var onError = function(e) {
    chromespec.log('Error: ' + e.code);
  };

  addButton('chooseEntry, readAsText', function() {
    // This method is called when a file entry is retrieved.
    var chooseEntryCallback = function(fileEntry) {
       fileEntry.file(onFileReceived, onError);
     };

     // This method is called when a file is received from a file entry.
     // It reads the file as text and chromespec.logs it.
     var onFileReceived = function(file) {
       var reader = new FileReader();
       reader.onload = function(evt) {
         chromespec.log('Text: ' + evt.target.result);
       };
       reader.onerror = function(evt) {
         chromespec.log('Error: ' + evt.target.error.code);
       };
       reader.readAsText(file);
     };

     chrome.fileSystem.chooseEntry({ }, chooseEntryCallback);
  });

  addButton('chooseEntry, readAsDataURL', function() {
     // This method is called when a file entry is retrieved.
     var chooseEntryCallback = function(fileEntry) {
       fileEntry.file(onFileReceived, onError);
     };

     // This method is called when a file is received from a file entry.
     // It reads the file as a data URL and chromespec.logs it.
     var onFileReceived = function(file) {
       var reader = new FileReader();
       reader.onload = function(evt) {
         chromespec.log('Data URL: ' + evt.target.result);
       };
       reader.onerror = function(evt) {
         chromespec.log('Error: ' + evt.target.error.code);
       };
       reader.readAsDataURL(file);
     };

     chrome.fileSystem.chooseEntry({ }, chooseEntryCallback);
   });

   addButton('chooseEntry, upload', function() {
     // This method is called when a file entry is retrieved.
     var chooseEntryCallback = function(fileEntry) {
       fileEntry.file(onFileReceived, onError);
     };

     // This method is called when a file is uploaded.
     var onFileUploaded = function(response) {
       chromespec.log('Response code: ' + response.responseCode);
     };

     // This method is called when a file is received from a file entry.
     // It uploads the file to a server.
     var onFileReceived = function(file) {
       var transfer = new FileTransfer();
       transfer.upload(file.fullPath, 'http://cordova-filetransfer.jitsu.com/upload', onFileUploaded, onError, { });
     };

     chrome.fileSystem.chooseEntry({ }, chooseEntryCallback);
  });
});
