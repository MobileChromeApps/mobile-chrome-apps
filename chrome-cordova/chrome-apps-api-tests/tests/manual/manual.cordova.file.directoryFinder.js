// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function() {

if (typeof cordova === 'undefined')
  return;

registerManualTests('cordova.file.directoryFinder', function(rootEl, addButton) {
  var Category = cordova.file.Category;
  var Persistence = cordova.file.Persistence;

  function addDropdown(text, id, values) {
    var $document = roolEl.ownerDocument;
    var container = $document.createElement('div');
    container.appendChild($document.createTextNode(text));

    var dropdown = $document.createElement('select');
    dropdown.id = id;
    for (var value in values) {
      var option = $document.createElement('option');
      option.value = values[value];
      option.textContent = value;
      dropdown.appendChild(option);
    }
    container.appendChild(dropdown);

    rootEl.appendChild(container);
  }

  addDropdown('writable: ', 'writable-dropdown', { 'TRUE' : true, 'FALSE' : false });
  addDropdown('sandboxed: ', 'sandboxed-dropdown', { 'TRUE' : true, 'FALSE' : false });
  addDropdown('category: ', 'category-dropdown', Category);
  addDropdown('persistence: ', 'persistence-dropdown', Persistence);

  addButton('Retrieve directories', function() {
    var writableDropdown = rootEl.querySelector('#writable-dropdown');
    var selectedWritableValue = writableDropdown.options[writableDropdown.selectedIndex].value;

    var sandboxedDropdown = rootEl.querySelector('#sandboxed-dropdown');
    var selectedSandboxedValue = sandboxedDropdown.options[sandboxedDropdown.selectedIndex].value;

    var categoryDropdown = rootEl.querySelector('#category-dropdown');
    var selectedCategoryValue = categoryDropdown.options[categoryDropdown.selectedIndex].value;

    var persistenceDropdown = rootEl.querySelector('#persistence-dropdown');
    var selectedPersistenceValue = persistenceDropdown.options[persistenceDropdown.selectedIndex].value;

    var getDirectoryForPurposeCallback = function(directoryEntry) {
      logger('path: ' + directoryEntry.fullPath);
    };

    cordova.file.getDirectoryForPurpose(selectedWritableValue, selectedSandboxedValue, selectedCategoryValue, selectedPersistenceValue, getDirectoryForPurposeCallback);
  });
});

}());
