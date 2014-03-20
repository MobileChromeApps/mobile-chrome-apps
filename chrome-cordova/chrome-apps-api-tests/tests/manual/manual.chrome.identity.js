// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerManualTests('chrome.identity', function(rootEl, addButton) {
  addButton('Get account and auth token', function() {
    var onGetAccountAndAuthTokenSuccess = function(account, token) {
      if (!account || !token) {
        logger('Failed to get a token.');
        logger('lastError = ' + JSON.stringify(chrome.runtime.lastError));
        return;
      }

      logger('Account id: ' + account.id);
      logger('Account email: ' + account.email);
      logger('Token: ' + token);
    };

    chrome.identity.getAccountAndAuthToken(onGetAccountAndAuthTokenSuccess);
  });

  addButton('Get auth token (interactive)', function() {
    var details = { interactive: true };

    var onGetAuthTokenSuccess = function(token) {
      if (!token) {
        logger('Failed to get a token.');
        logger('lastError = ' + JSON.stringify(chrome.runtime.lastError));
        return;
      }

      logger('Token: ' + token);
    };

    chrome.identity.getAuthToken(details, onGetAuthTokenSuccess);
  });

  addButton('Get auth token (non-interactive)', function() {
    var details = { interactive: false };

    var onGetAuthTokenSuccess = function(token) {
      if (!token) {
        logger('Failed to get a token.');
        logger('lastError = ' + JSON.stringify(chrome.runtime.lastError));
        return;
      }

      logger('Token: ' + token);
    };

    chrome.identity.getAuthToken(details, onGetAuthTokenSuccess);
  });

  addButton('Get auth token (non-interactive, cordovium1)', function() {
    var details = { interactive: false, account: { id: 'TEST_ID', email: 'cordovium1@gmail.com' } };

    var onGetAuthTokenSuccess = function(token) {
      if (!token) {
        logger('Failed to get a token.');
        logger('lastError = ' + JSON.stringify(chrome.runtime.lastError));
        return;
      }

      logger('Token: ' + token);
    };

    chrome.identity.getAuthToken(details, onGetAuthTokenSuccess);
  });
});

