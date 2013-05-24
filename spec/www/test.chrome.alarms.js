// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chromeSpec('chrome.alarms', function(runningInBackground) {
  var alarmEarlyTolerance = 30;
  var alarmLateTolerance = 800;
  var scheduledEarlyTolerance = 5;
  var scheduledLateTolerance = 100;
  var testTimeout = 3000;

  it('should contain definitions', function() {
    expect(chrome.alarms).toBeDefined();
    expect(chrome.alarms.create).toBeDefined();
    expect(chrome.alarms.get).toBeDefined();
    expect(chrome.alarms.getAll).toBeDefined();
    expect(chrome.alarms.clear).toBeDefined();
    expect(chrome.alarms.clearAll).toBeDefined();
    expect(chrome.alarms.onAlarm).toBeDefined();
  });

  // Important note: When running these tests on IOS, scrolling the display while a test is running can cause alarms to
  // be delayed and can introduce flakiness.
  describe('testing alarms', function() {
    var screenMoveListener = function() {
      console.log('WARNING: scrolling the display during test execution can cause flakiness.');
    };

    beforeEach(function() {
      isWithinDelta = function(actual, expected, lowerDelta, upperDelta) {
        return expected - lowerDelta <= actual && expected + upperDelta >= actual;
      };
      this.addMatchers({
        toBeWithinDelta: function(expected, lowerDelta, upperDelta) {
          return isWithinDelta(this.actual, expected, lowerDelta, upperDelta);
        },
        toMatchAlarm: function(expectedAlarm) {
          return expectedAlarm.name == this.actual.name &&
                 isWithinDelta(this.actual.scheduledTime, expectedAlarm.scheduledTime,
                               scheduledEarlyTolerance, scheduledLateTolerance) &&
                 expectedAlarm.periodInMinutes == this.actual.periodInMinutes;
         }
      });

      document.addEventListener('touchmove', screenMoveListener);
    });
    afterEach(function() {
      document.removeEventListener('touchmove', screenMoveListener);
    });

    describe('testing create', function() {
      beforeEach(function() {
        chrome.alarms.clearAll();
        chrome.alarms.getAll(function(alarms) {
          expect(alarms.length).toBe(0);
        });
      });
      afterEach(function() {
        chrome.alarms.clearAll();
      });

      itWaitsForDone('when set only', function(done) {
        var expectedFireTime = Date.now() + 10;

        chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
          expect(Date.now()).toBeWithinDelta(expectedFireTime, alarmEarlyTolerance, alarmLateTolerance);
          expect(alarm.name).toBe('myalarm');
          expect(alarm.scheduledTime).toBe(expectedFireTime);
          expect(alarm.periodInMinutes).not.toBeDefined();
          chrome.alarms.onAlarm.removeListener(alarmHandler);
          done();
        });
        chrome.alarms.create('myalarm', { when:expectedFireTime });
      }, testTimeout);

      itWaitsForDone('delayInMinutes set only', function(done) {
        var expectedFireTime = Date.now() + 15;

        chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
          expect(Date.now()).toBeWithinDelta(expectedFireTime, alarmEarlyTolerance, alarmLateTolerance);
          expect(alarm.name).toBe('myalarm');
          expect(alarm.scheduledTime).toBeWithinDelta(expectedFireTime, scheduledEarlyTolerance, scheduledLateTolerance);
          expect(alarm.periodInMinutes).not.toBeDefined();
          chrome.alarms.onAlarm.removeListener(alarmHandler);
          setTimeout(function() {
            chrome.alarms.getAll(function(alarms) {
              expect(alarms.length).toBe(0);
              done();
            });
          }, 0);
        });

        chrome.alarms.create('myalarm', { delayInMinutes:0.00025 });
      }, testTimeout);

      itWaitsForDone('periodInMinutes set only', function(done) {
        var expectedFireTime = Date.now() + 15;
        var callNumber = 0;

        chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
          callNumber++;
          expect(Date.now()).toBeWithinDelta(expectedFireTime, alarmEarlyTolerance, alarmLateTolerance);
          expect(alarm.name).toBe('myalarm');
          expect(alarm.scheduledTime).toBeWithinDelta(expectedFireTime, scheduledEarlyTolerance, scheduledLateTolerance);
          expect(alarm.periodInMinutes).toBe(0.00025);
          if (callNumber < 3) {
            expectedFireTime += 15;
          } else {
            chrome.alarms.onAlarm.removeListener(alarmHandler);
            done();
          }
        });

        chrome.alarms.create('myalarm', { periodInMinutes:0.00025 });
      }, testTimeout);

      itWaitsForDone('periodInMinutes and delayInMinutes set', function(done) {
        var callNumber = 0;
        var expectedFireTime = Date.now() + 30;

        chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
          callNumber++;
          expect(Date.now()).toBeWithinDelta(expectedFireTime, alarmEarlyTolerance, alarmLateTolerance);
          expect(alarm.name).toBe('myalarm');
          expect(alarm.scheduledTime).toBeWithinDelta(expectedFireTime, scheduledEarlyTolerance, scheduledLateTolerance);
          expect(alarm.periodInMinutes).toBe(0.00025);
          if (callNumber < 3) {
            expectedFireTime += 15;
          } else {
            chrome.alarms.onAlarm.removeListener(alarmHandler);
            done();
          }
        });

        chrome.alarms.create('myalarm', { delayInMinutes:0.0005, periodInMinutes:0.00025 });
      }, testTimeout);

      itWaitsForDone('multiple alarms', function(done) {
        var expectedAlarms = { alarm1:{ name:'alarm1', scheduledTime:Date.now() + 10 },
                               alarm2:{ name:'alarm2', scheduledTime:Date.now() + 15 },
                               alarm3:{ name:'alarm3', scheduledTime:Date.now() + 20 } };
        chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
          expect(alarm.name).toBe(expectedAlarms[alarm.name].name);
          expect(alarm.scheduledTime).toBeWithinDelta(expectedAlarms[alarm.name].scheduledTime, scheduledEarlyTolerance,
                                                      scheduledLateTolerance);
          expect(alarm.periodInMinutes).not.toBeDefined();
          delete expectedAlarms[alarm.name];
          if (Object.keys(expectedAlarms).length == 0) {
            chrome.alarms.onAlarm.removeListener(alarmHandler);
            done();
          }
        });

        for (var name in expectedAlarms) {
          chrome.alarms.create(name, { when:expectedAlarms[name].scheduledTime });
        }
      }, testTimeout);
    });

    describe('testing get', function() {
      var future = Date.now() + 100000;
      var inputAlarmInfo = { alarm1:{ when:future }, alarm2:{ delayInMinutes:2 }, alarm3:{ periodInMinutes:3 } };
      var expectedAlarms;
      beforeEach(function() {
        chrome.alarms.clearAll();
        chrome.alarms.getAll(function(alarms) {
          expect(alarms.length).toBe(0);
        });
        expectedAlarms = { alarm1:{ name:'alarm1', scheduledTime:future },
                           alarm2:{ name:'alarm2', scheduledTime:Date.now() + 120000 },
                           alarm3:{ name:'alarm3', scheduledTime:Date.now() + 180000,
                                    periodInMinutes:3 } };
        for (var name in inputAlarmInfo) {
          chrome.alarms.create(name, inputAlarmInfo[name]);
        }
      });
      afterEach(function() {
        chrome.alarms.clearAll();
      });

      itWaitsForDone('get one', function(done) {
        var numCalls = 0;
        function verifyAlarm(alarm) {
          numCalls++;
          expect(alarm).toMatchAlarm(expectedAlarms[alarm.name]);
          if (numCalls >= Object.keys(expectedAlarms).length) {
            done();
          }
        }
        for (var name in inputAlarmInfo) {
          chrome.alarms.get(name, verifyAlarm);
        }
      }, testTimeout);

      itWaitsForDone('get all', function(done) {
        chrome.alarms.getAll(function(alarms) {
          for(var i = 0; i < alarms.length; i++) {
            expect(alarms[i]).toMatchAlarm(expectedAlarms[alarms[i].name]);
          }
          done();
        });
      }, testTimeout);
    });

    describe('testing clear', function() {
      var alarmHandler;
      var createAlarms;

      beforeEach(function() {
        var inputAlarmInfo = { alarm1:{ when:Date.now() + 100 }, alarm2:{ delayInMinutes:0.001 },
                               alarm3:{ periodInMinutes:0.002 } };
        chrome.alarms.clearAll();
        chrome.alarms.getAll(function(alarms) {
          expect(alarms.length).toBe(0);
        });
        nameSpy = jasmine.createSpy('nameSpy');
        chrome.alarms.onAlarm.addListener(function alarmHandler(alarm) {
          nameSpy(alarm.name);
        });
        createAlarms = function() {
          for (var name in inputAlarmInfo) {
            chrome.alarms.create(name, inputAlarmInfo[name]);
          }
        }
      });
      afterEach(function() {
        chrome.alarms.onAlarm.removeListener(alarmHandler);
        chrome.alarms.clearAll();
      });

      itWaitsForDone('clear one', function(done) {
        // Create alarms here rather than in beforeEach to be extra sure that no alarm fires
        // before clearing it within the actual test.
        createAlarms();
        chrome.alarms.clear('alarm3');
        setTimeout(function() {
          expect(nameSpy).toHaveBeenCalledWith('alarm1');
          expect(nameSpy).toHaveBeenCalledWith('alarm2');
          expect(nameSpy).not.toHaveBeenCalledWith('alarm3');
          done();
        }, 200);
      }, testTimeout);

      itWaitsForDone('clear all', function(done) {
        createAlarms();
        chrome.alarms.clearAll();
        setTimeout(function() {
          expect(nameSpy).not.toHaveBeenCalled();
          done();
        }, 200 );
      }, testTimeout);
      
      itWaitsForDone('clear unknown name', function(done) {
        createAlarms();
        chrome.alarms.clear('unknownName');
        setTimeout(function() {
          expect(nameSpy).toHaveBeenCalledWith('alarm1');
          expect(nameSpy).toHaveBeenCalledWith('alarm2');
          expect(nameSpy).toHaveBeenCalledWith('alarm3');
          done();
        }, 200);
      }, testTimeout);
    });
  });
});
