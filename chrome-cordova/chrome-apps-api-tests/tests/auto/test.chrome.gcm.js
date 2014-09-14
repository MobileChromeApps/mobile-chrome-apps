// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.gcm", function() {
  'use strict';
  var testTimeout = 2000;
  var senderid = '90031296475';
  var sender = senderid+ "@gcm.googleapis.com";

  describeAndroidOnly('testing registration', function() {
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
        expect(e.message.substring(0,13)).toEqual('Invalid value');
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

    it('should error for invalid data', function(done) {
      var message = {
        'messageId' : '0',
        'destinationId' : sender,
        'timeToLive' : 0,
        'data' : { 'collapse_key': '1', 'test' : 'test' }
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect(msgid.length).toBeGreaterThan(0);
          done();
        });
      } catch (e) {
          expect(e.message).toEqual("Invalid data key: collapse_key");
          done();
      }
    });
  });

  describe('testing sending', function() {
    // TODO don't run on ios
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
        expect(e.message.substring(0,16)).toEqual("Payload exceeded");
        done();
      }
    });

    it('should send and receive one msg', function(done) {
      var message = {
        'destinationId' : sender,
        'messageId' : '0',
        'timeToLive' : 10,
        'data' : { 'type': 'ping', 'message' : 'test' }
      };
      chrome.gcm.onMessage.addListener(function(msg) {
        expect(msg.data.type).toBe('pong')
        expect(msg.data.message).toBe('test')

        chrome.gcm.onMessage.removeListener(this);
        done();
      });
      try {
        chrome.gcm.send(message, function(msgid) {
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
