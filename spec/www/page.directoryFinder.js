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

  function addDropdown(name, values) {
    var dropdown = chromespec.createDropdown(name, values);
    rootEl.appendChild(dropdown);
  }

  addDropdown('writable', { 'TRUE' : true, 'FALSE' : false });
  addDropdown('sandboxed', { 'TRUE' : true, 'FALSE' : false });
  addDropdown('category', Category);
  addDropdown('persistence', Persistence);

  addButton('Retrieve directories', function() {
    var writableDropdown = chromespec.fgDoc.getElementById('writable-dropdown');
    var selectedWritableOption = writableDropdown.options[writableDropdown.selectedIndex];

    var sandboxedDropdown = chromespec.fgDoc.getElementById('sandboxed-dropdown');
    var selectedSandboxedOption = sandboxedDropdown.options[sandboxedDropdown.selectedIndex];

    var categoryDropdown = chromespec.fgDoc.getElementById('category-dropdown');
    var selectedCategoryOption = categoryDropdown.options[categoryDropdown.selectedIndex];

    var persistenceDropdown = chromespec.fgDoc.getElementById('persistence-dropdown');
    var selectedPersistenceOption = persistenceDropdown.options[persistenceDropdown.selectedIndex];

    var getDirectoryForPurposeCallback = function(directoryEntry) {
      chromespec.log('path: ' + directoryEntry.fullPath);
    };

    cordova.file.getDirectoryForPurpose(selectedWritableOption.value, selectedSandboxedOption.value, selectedCategoryOption.value, selectedPersistenceOption.value, getDirectoryForPurposeCallback);
  });
});

