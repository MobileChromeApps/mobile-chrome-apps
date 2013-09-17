// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromespec.registerSubPage('cordova.file.directoryFinder', function(rootEl) {
  var Category = cordova.file.Category;
  var Persistence = cordova.file.Persistence;

  function addButton(name, func) {
    var button = chromespec.createButton(name, func);
    rootEl.appendChild(button);
  }

  function addDropdown(text, id, values) {
    var dropdown = chromespec.createDropdown(text, id, values);
    rootEl.appendChild(dropdown);
  }

  addDropdown('writable: ', 'writable-dropdown', { 'TRUE' : true, 'FALSE' : false });
  addDropdown('sandboxed: ', 'sandboxed-dropdown', { 'TRUE' : true, 'FALSE' : false });
  addDropdown('category: ', 'category-dropdown', Category);
  addDropdown('persistence: ', 'persistence-dropdown', Persistence);

  addButton('Retrieve directories', function() {
    var writableDropdown = chromespec.fgDoc.getElementById('writable-dropdown');
    var selectedWritableValue = writableDropdown.options[writableDropdown.selectedIndex].value;

    var sandboxedDropdown = chromespec.fgDoc.getElementById('sandboxed-dropdown');
    var selectedSandboxedValue = sandboxedDropdown.options[sandboxedDropdown.selectedIndex].value;

    var categoryDropdown = chromespec.fgDoc.getElementById('category-dropdown');
    var selectedCategoryValue = categoryDropdown.options[categoryDropdown.selectedIndex].value;

    var persistenceDropdown = chromespec.fgDoc.getElementById('persistence-dropdown');
    var selectedPersistenceValue = persistenceDropdown.options[persistenceDropdown.selectedIndex].value;

    var getDirectoryForPurposeCallback = function(directoryEntry) {
      chromespec.log('path: ' + directoryEntry.fullPath);
    };

    cordova.file.getDirectoryForPurpose(selectedWritableValue, selectedSandboxedValue, selectedCategoryValue, selectedPersistenceValue, getDirectoryForPurposeCallback);
  });
});

