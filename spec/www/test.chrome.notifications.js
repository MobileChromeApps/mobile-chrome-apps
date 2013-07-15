// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.notifications', function(runningInBackground) {
  var testTimeout = 2000;

  it('should contain definitions', function() {
    expect(chrome.notifications).toBeDefined();
    expect(chrome.notifications.create).toBeDefined();
    expect(chrome.notifications.update).toBeDefined();
    expect(chrome.notifications.clear).toBeDefined();
    expect(chrome.notifications.getAll).toBeDefined();
    expect(chrome.notifications.onClosed).toBeDefined();
    expect(chrome.notifications.onClicked).toBeDefined();
    expect(chrome.notifications.onButtonClicked).toBeDefined();
  });

  describe('testing notifications', function() {
    function createNotifications(callback) {
      chrome.notifications.create(ids[0], options, function(id0) {
        expect(id0).toBe(ids[0]);
        chrome.notifications.create(ids[1], options, function(id1) {
          expect(id1).toBe(ids[1]);
          chrome.notifications.create('', options, function(id2) {
            expect(id2).toBeString();
            expect(id2).not.toBe('');
            ids.push(id2);
            callback();
          });
        });
      });
    }

    function clearAllNotifications(callback) {
      chrome.notifications.getAll(function clearNotifications(notifications) {
        notificationArray = Object.keys(notifications);
        if (notificationArray.length == 0) {
          callback();
          return;
        } else {
          chrome.notifications.clear(notificationArray[0], function() {
            delete notifications[notificationArray[0]];
            clearNotifications(notifications);
          });
        }
      });
    }

    function checkNotificationsEqual(expected, callback) {
      chrome.notifications.getAll(function(notifications) {
        for (id in notifications) {
          expect(expected).toContain(id);
        }
        callback();
      });
    }

    var ids;
    var options;

    beforeEach(function() {
      ids = [ 'id0', 'id1' ];
      options = {'type':'basic', 'iconUrl':'assets/icon-128x128.png', 'title':'Notification Title',
                 'message':'Notification Message' };
      this.addMatchers({
        toBeString: function() {
          this.message = function() {
            return 'Expected ' + this.actual + ' to be a string.';
          }
          return typeof this.actual == 'string';
        }
      });
    });

    afterEach(function() {
      var done = false;
      runs(function() {
        clearAllNotifications(function() {
          done = true;
        });
      });
      
      waitsFor(function() {
        return done;
      }, 300);
    });

    itWaitsForDone('create and getAll', function(done) {
      createNotifications(function() {
        checkNotificationsEqual(ids, done);
      });
    }, testTimeout);

    itWaitsForDone('update', function(done) {
      createNotifications(function() {
        options.title = 'New Notification Title';
        chrome.notifications.update(ids[1], options, function(wasUpdated) {
          expect(wasUpdated).toBe(true);
          chrome.notifications.update('id123456', options, function(wasUpdated) {
            expect(wasUpdated).toBe(false);
            checkNotificationsEqual(ids, done);
          });
        });
      });
    }, testTimeout);

    itWaitsForDone('clear', function(done) {
      createNotifications(function() {
        chrome.notifications.clear(ids[0], function(wasCleared) {
          expect(wasCleared).toBe(true);
          ids.shift();
          checkNotificationsEqual(ids, function()    {
            chrome.notifications.clear('id123456', function(wasCleared) {
              expect(wasCleared).toBe(false);
              checkNotificationsEqual(ids, done);
            });
          });
        });
      });
    }, testTimeout);
  });
});
