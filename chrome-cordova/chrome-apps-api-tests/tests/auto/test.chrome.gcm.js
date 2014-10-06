// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.gcm", function() {
  'use strict';
  var senderid = '90031296475';
  var sender = senderid+ "@gcm.googleapis.com";

  describeExcludeIos('registration', function() {
    it('should contain definitions', function(done) {
      expect(chrome.gcm).toBeDefined();
      expect(chrome.gcm.send).toBeDefined();
      expect(chrome.gcm.register).toBeDefined();
      expect(chrome.gcm.unregister).toBeDefined();
      expect(chrome.gcm.onMessage).toBeDefined();
      expect(chrome.gcm.onSendError).toBeDefined();
      expect(chrome.gcm.onMessagesDeleted).toBeDefined();
      done();
    });

    it('should register and unregister', function(done) {
      chrome.gcm.register([senderid], function(regid) {
        expect(regid).toBeDefined();
        expect(regid.length).toBeGreaterThan(1);
        expect(chrome.runtime.lastError).not.toBeDefined();
        chrome.gcm.unregister(function() {
          expect(chrome.runtime.lastError).not.toBeDefined();
          done();
        });
      });
    });

    it('should fail to register with a blank sender', function(done) {
      try {
        chrome.gcm.register([''], function(regid) {
          expect('Not to get here').toEqual('');
        });
      } catch(e) {
        expect(e.message).toBeDefined();
        expect(chrome.runtime.lastError).not.toBeDefined();
      }
      done();
    });

    it('should re-register', function(done) {
      chrome.gcm.register([senderid], function(regid) {
        expect(regid.length).toBeGreaterThan(1);
        expect(chrome.runtime.lastError).not.toBeDefined();
        done();
      });
    });

  });

  describeExcludeIos('sending', function() {
    it('should error for missing key', function(done) {
      var message = {
        'data' : { 'test' : 'test' }
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect("Should not be here").not.toBeDefined();
          done();
        });
      } catch (e) {
        expect(e.message).toBeDefined();
        done();
      }
    });

    it('should error for invalid data', function(done) {
      var message = {
        'messageId' : '0',
        'destinationId' : sender,
        'timeToLive' : 0,
        'data' : { 'collapse_key': '1', 'test' : 'test' }
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect("Should not be here").not.toBeDefined();
          done();
        });
      } catch (e) {
        expect(e.message).toBeDefined();
        done();
      }
    });

    it('should fail to send a big msg', function(done) {
      var blob100 = '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789';
      var msgdata = {};
      for(var k = 0; k < 41; k++){
        var key = 'k' + k;
        msgdata[key] = blob100;
      }
      var message = {
        'destinationId' : sender,
        'messageId' : '0',
        'timeToLive' : 10,
        'data' : msgdata
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect('Should not get here').toBe(false);
          done();
        });
      } catch (e) {
        expect(e.message).toBeDefined();
        //expect(e.message.substring(0,16)).toEqual("Payload exceeded");
        done();
      }
    });

    it('should send and receive one simple msg', function(done) {
      var message = {
        'destinationId' : sender,
        'messageId' : '0',
        'timeToLive' : 10,
        'data' : { 'type': 'ping', 'message' : 'test' }
      };
      chrome.gcm.onMessage.addListener(function listener(msg) {
        expect(msg).toBeDefined();
        expect(msg.data).toBeDefined();
        expect(msg.data.type).toEqual('pong')
        expect(msg.data.message).toEqual('test')

        chrome.gcm.onMessage.removeListener(listener);
        done();
      });
      try {
        chrome.gcm.send(message, function(msgid) {
          expect(msgid).toBeDefined();
          expect(msgid.length).toBeGreaterThan(0);
          expect(chrome.runtime.lastError).not.toBeDefined();
        });
      } catch (e) {
          expect(e).not.toBeDefined();
      }
    });

    it('should send and receive one complex msg', function(done) {
      var message = {
        'destinationId' : sender,
        'messageId' : '0',
        'timeToLive' : 10,
        'data' : {
          'type': 'ping',
          'message' : 'testing multi value',
          'message2': 'more2',
          'message3': 'more3',
          'message4': 'more4',
          'message5': 'more5',
          //'int': 1,
          //'float': 3.33,
          //'bool': true,
          //'string': 'sss',
          //'array': [1, 3.33, true, 'sss', [1,2,3], {'a':1, 'b':2}],
          //'map': {'a': 1, 'b': 2}
        }
      };
      chrome.gcm.onMessage.addListener(function listener(msg) {
        expect(msg).toBeDefined();
        expect(msg.data).toBeDefined();
        expect(msg.data.type).toEqual('pong')
        expect(msg.data.message).toEqual(message.data.message)

        chrome.gcm.onMessage.removeListener(listener);
        done();
      });
      try {
        chrome.gcm.send(message, function(msgid) {
          expect(msgid).toBeDefined();
          expect(msgid.length).toBeGreaterThan(0);
          expect(chrome.runtime.lastError).not.toBeDefined();
        });
      } catch (e) {
          expect(e).not.toBeDefined();
      }
    });

    // I would love to test onSendError and onMessagesDeleted

  });
});
