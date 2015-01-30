// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* global afterEach */
/* global beforeEach */
/* global describe */
/* global jasmine */
registerAutoTests("chrome.notifications", function() {
  'use strict';
  var testTimeout = 2000;

  function clearAllNotifications(callback) {
    chrome.notifications.getAll(function clearNotifications(notifications) {
      var notificationArray = Object.keys(notifications);
      if (notificationArray.length === 0) {
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

    describeExcludeIos('testing notifications', function() {
     function createNotifications(callback) {
       chrome.notifications.create(ids[0], options, function(id0) {
         expect(id0).toBe(ids[0]);
         chrome.notifications.create(ids[1], options, function(id1) {
           expect(id1).toBe(ids[1]);
           chrome.notifications.create('x', options, function(id2) {
             expect(id2).toBeString();
             ids.push(id2);
             callback();
           });
         });
      });
     }

    function checkNotificationsEqual(expected, callback) {
      chrome.notifications.getAll(function(notifications) {
        for (var id in notifications) {
          expect(expected).toContain(id);
        }
        callback();
      });
    }

    var ids;
    var options;
    var customMatchers = {
       toBeString : function(util,customEqualityTesters){
         return {
           compare : function(actual, expected){
             var result = {};
             result.pass = (typeof actual == 'string');
             result.message = 'Expected ' + actual + ' to be a string.';
             return result;
           }
         };
       }
    };

    beforeEach(function(done) {
      ids = [ 'id0', 'id1' ];
      options = {'type':'basic', 'iconUrl':'assets/icon-128x128.png', 'title':'Notification Title',
                 'message':'Notification Message' };
      jasmine.addMatchers(customMatchers);
      done();
    });

    afterEach(function(done) {
        clearAllNotifications(function() {
          done();
        });
    });

    it('create and getAll', function(done) {
      createNotifications(function() {
        checkNotificationsEqual(ids, done);
      });
    });

    it('update', function(done) {
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
    });

    it('clear', function(done) {
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
    });
  });

  describeExcludeIos('parameter validation', function() {

    function createNotificationWithMissingOption(done) {
      createNotification('lasterror', done);
    }

    function createNotificationWithInvalidOptionValue(done) {
      createNotification('exception', done);
    }

    function createNotificationWithInvalidCombinationOfOptions(done) {
      createNotification('lasterror', done);
    }

    function createNotification(expectedBehaviour, done) {
      var notificationCallbackShouldExecute = false;
      var lastErrorShouldBeSet = false;
      var exceptionShouldBeThrown = false;

      switch (expectedBehaviour) {
        case 'callback':
          notificationCallbackShouldExecute = true;
          break;
        case 'lasterror':
          notificationCallbackShouldExecute = true;
          lastErrorShouldBeSet = true;
          break;
        case 'exception':
          exceptionShouldBeThrown = true;
          break;
      }

      var callbackExecuted = false;
      var lastErrorSet = false;
      var thrownException = null;

      try {
        chrome.notifications.create(ids[0], options, function(id0) {
          callbackExecuted = true;
          lastErrorSet = (chrome.runtime.lastError !== null);
        });
      } catch (e) {
        thrownException = e;
      }

      // Wait briefly to give the callback time to be executed
      setTimeout(function() {
        expect(callbackExecuted).toBeWithName(notificationCallbackShouldExecute, 'callback executed');
        expect(lastErrorSet).toBeWithName(lastErrorShouldBeSet, 'last error');
        expect(thrownException !== null).toBeWithName(exceptionShouldBeThrown, 'exception thrown');

        // Verify that the notification was *not* created
        checkNotificationsEmpty(done);
      }, 250);
    }

    function checkNotificationsEmpty(callback) {
      chrome.notifications.getAll(function(notifications) {
        for (var id in notifications) {
          expect(ids).not.toContain(id);
        }
        callback();
      });
    }

    function updateNotificationWithMissingOption(applyChangesToBeUpdated, done) {
      updateNotification('callback', null, applyChangesToBeUpdated, done);
    }

    function updateNotificationWithInvalidCombinationOfOptions(applyChangesToBeUpdated, done) {
      updateNotification('lasterror', null, applyChangesToBeUpdated, done);
    }

    function updateNotificationMultipleWithMissingOption(applyChangesForFirstUpdate, applyChangesForSecondUpdate, done) {
      var setup = function(notificationId, callback) {
        chrome.notifications.create(notificationId, options, function(id) {
          // Make the changes to the options for the first update
          applyChangesForFirstUpdate();

          chrome.notifications.update(notificationId, options, function(wasUpdated) {
            callback(id);
          });
        });
      };

      // Call the standard function to do the second update and check results
      updateNotification('callback', setup, applyChangesForSecondUpdate, done);
    }

    function updateNotificationWithInvalidOptionValue(applyChangesToBeUpdated, done) {
      updateNotification('exception', null, applyChangesToBeUpdated, done);
    }

    function updateNotification(expectedBehaviour, setupNotification, applyChangesToBeUpdated, done) {
      var waitForCallback = 250;
      var notificationCallbackShouldExecute = false;
      var lastErrorShouldBeSet = false;
      var exceptionShouldBeThrown = false;

      switch (expectedBehaviour) {
        case 'callback':
          notificationCallbackShouldExecute = true;
          // Successful callbacks take longer than failures
          waitForCallback = 500;
          break;
        case 'lasterror':
          notificationCallbackShouldExecute = true;
          lastErrorShouldBeSet = true;
          break;
        case 'exception':
          exceptionShouldBeThrown = true;
          break;
      }

      var callbackExecuted = false;
      var lastErrorSet = false;
      var thrownException = null;
      var notificationId = ids[0];

      if (!setupNotification)
      {
          setupNotification = function(id, callback) {
              chrome.notifications.create(id, options, callback);
          };
      }
      setupNotification(notificationId, function(id) {
        // Make changes to the options to be passed to the update
        applyChangesToBeUpdated();

        try {
          chrome.notifications.update(notificationId, options, function(wasUpdated) {
            callbackExecuted = true;
            lastErrorSet = (chrome.runtime.lastError !== null);
            // Should have been updated if expecting callback + no error
            expect(wasUpdated).toBeWithName(notificationCallbackShouldExecute && !lastErrorShouldBeSet, 'wasUpdated');
          });
        } catch (e) {
          thrownException = e;
          if (!exceptionShouldBeThrown) {
            console.log('Unexpected exception: ' + e);
          }
        }
      });

      // Wait briefly to give the callback time to be executed
      setTimeout(function() {
        expect(callbackExecuted).toBeWithName(notificationCallbackShouldExecute, 'callback executed');
        expect(lastErrorSet).toBeWithName(lastErrorShouldBeSet, 'last error');
        expect(thrownException !== null).toBeWithName(exceptionShouldBeThrown, 'exception thrown');

        done();
      }, waitForCallback);
    }

    function removeOption(paramToOmit)
    {
      delete options[paramToOmit];
    }

    var ids;
    var options;
    var IMAGE_URL = 'icon-128x128.png';
    var customMatchers = {
      toBeString : function(util,customEqualityTesters){
        return {
          compare : function(actual, expected){
            var result = {};
            result.pass = (typeof actual == 'string');
            result.message = 'Expected ' + actual + ' to be a string.';
            return result;
          }
        };
      },
      toBeWithName : function(util,customEqualityTesters){
        return {
          compare : function(actual, expected, label){
            var result = {};
            result.pass = (actual === expected);
            result.message = 'Expected ' + actual + ' (' + label + ') to be ' + expected;
            return result;
          }
        };
      }
    };

    beforeEach(function(done) {
      ids = [ 'id0', 'id1' ];
      options = {'type':'basic', 'iconUrl':'assets/icon-128x128.png', 'title':'Notification Title','message':'Notification Message' };
      jasmine.addMatchers(customMatchers);
      done();
    });

    afterEach(function(done) {
      clearAllNotifications(function() {
        done();
      });
    });

    it('create should require: type', function(done) {
      removeOption('type');
      createNotificationWithMissingOption(done);
    });

    it('create should require: iconUrl', function(done) {
      removeOption('iconUrl');
      createNotificationWithMissingOption(done);
    });

    it('create should require: title', function(done) {
      removeOption('title');
      createNotificationWithMissingOption(done);
    });

    it('create should require: message', function(done) {
      removeOption('message');
      createNotificationWithMissingOption(done);
    });

    it('create should enforce valid value for: type', function(done) {
      options.type = 'invalid';
      createNotificationWithInvalidOptionValue(done);
    });

    it('create should only allow imageUrl for type = image', function(done) {
      options.type = 'basic';
      options.imageUrl = options.iconUrl;
      createNotificationWithInvalidCombinationOfOptions(done);
    });

    it('create should only allow list items for type = list', function(done) {
      options.type = 'basic';
      options.items =
        [
          {'title':'Item 1','message':'This is a list item'},
          {'title':'Second Item','message':'Another list item'}
        ];
      createNotificationWithInvalidCombinationOfOptions(done);
    });

    it('create should only allow progress value for type = progress', function(done) {
      options.type = 'basic';
      options.progress = 42;
      createNotificationWithInvalidCombinationOfOptions(done);
    });

    it('update should not require: type', function(done) {
      updateNotificationWithMissingOption(function() {
        removeOption('type');
      }, done);
    });

    it('update should not require: iconUrl', function(done) {
      updateNotificationWithMissingOption(function() {
        removeOption('iconUrl');
      }, done);
    });

    it('update should not require: title', function(done) {
      updateNotificationWithMissingOption(function() {
        removeOption('title');
      }, done);
    });

    it('update should not require: message', function(done) {
      updateNotificationWithMissingOption(function() {
        removeOption('message');
      }, done);
    });

    it('update should enforce valid value for: type', function(done) {
      updateNotificationWithInvalidOptionValue(function() {
        options.type = 'invalid';
      }, done);
    });

    it('update should allow only imageUrl to be specified', function(done) {
      options.type = 'image';
      updateNotificationWithMissingOption(function() {
        options = {'imageUrl' : IMAGE_URL};
      }, done);
    });

    it('update should allow only progress to be specified', function(done) {
      options.type = 'progress';
      updateNotificationWithMissingOption(function() {
        options = {'progress' : 42};
      }, done);
    });

    it('update should allow only list items to be specified', function(done) {
      options.type = 'list';
      updateNotificationWithMissingOption(function() {
        options = { 'items':
          [
            {'title':'Item 1','message':'This is a list item'},
            {'title':'Second Item','message':'Another list item'}
          ]};
      }, done);
    });

    it('update should only allow imageUrl for type = image', function(done) {
      options.type = 'basic';
      updateNotificationWithInvalidCombinationOfOptions(function() {
        options = {'imageUrl' : IMAGE_URL};
      }, done);
    });

    it('update should only allow list items for type = list', function(done) {
      options.type = 'basic';
      updateNotificationWithInvalidCombinationOfOptions(function() {
        options = { 'items':
          [
            {'title':'Item 1','message':'This is a list item'},
            {'title':'Second Item','message':'Another list item'}
          ]};
      }, done);
    });

    it('update should only allow progress value for type = progress', function(done) {
      options.type = 'basic';
      updateNotificationWithInvalidCombinationOfOptions(function() {
        options = {'progress' : 42};
      }, done);
    });

    it('multiple updates should allow only imageUrl to be specified', function(done) {
        // Order of changes
        //  - Create a notification of type 'basic'
        //  - Change it to be of type 'image'
        //  - Finally, update only the imageUrl property
        // Knowing that some platforms (i.e. android), always re-create the
        // notification, this test will verify that a series of incremental
        // updates will succeed
      updateNotificationMultipleWithMissingOption(
        function() {
          options = {'type' : 'image'};
        },
        function() {
          options = {'imageUrl' : IMAGE_URL};
        },
        done);
    });

    it('multiple updates should allow only list items to be specified', function(done) {
        // Order of changes
        //  - Create a notification of type 'basic'
        //  - Change it to be of type 'list'
        //  - Finally, update only the items property
        // Knowing that some platforms (i.e. android), always re-create the
        // notification, this test will verify that a series of incremental
        // updates will succeed
      updateNotificationMultipleWithMissingOption(
          function() {
              options = {'type' : 'list'};
          },
          function() {
            options = { 'items':
              [
                {'title':'Item 1','message':'This is a list item'},
                {'title':'Second Item','message':'Another list item'}
              ]};
          },
          done);
    });

    it('multiple updates should allow only progress to be specified', function(done) {
        // Order of changes
        //  - Create a notification of type 'basic'
        //  - Change it to be of type 'progress'
        //  - Finally, update only the progress property
        // Knowing that some platforms (i.e. android), always re-create the
        // notification, this test will verify that a series of incremental
        // updates will succeed
      updateNotificationMultipleWithMissingOption(
          function() {
              options = {'type' : 'progress'};
          },
          function() {
              options = {'progress' : 42};
          },
          done);
    });

  }); // describe 'parameter validation'
});
