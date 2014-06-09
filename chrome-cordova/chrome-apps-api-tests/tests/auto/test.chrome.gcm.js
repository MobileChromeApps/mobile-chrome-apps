// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.gcm", function() {
  'use strict';
  var testTimeout = 2000;
  var senderid = '90031296475';
//  var senderid = '594483801284';
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

  describeAndroidOnly('testing sending', function() {

    var msgcount=0;
    var globdone=null;
    var listener = function(msg) {
      console.log(' msg',msg);
      msgcount++;
      if(globdone) globdone();
    }
    beforeEach( function() {
      chrome.gcm.onMessage.addListener(listener);
    })

    afterEach( function() {
      chrome.gcm.onMessage.removeListener(listener);
      expect(msgcount=1);
    })

    it('should send and receive one msg', function(done) {
      globdone=done;
      var message = {
        'destinationId' : sender,
        'messageId' : '0',
        'timeToLive' : 10,
        'data' : { 'test' : 'test' }
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect(msgid.length).toBeGreaterThan(0);
          expect(chrome.runtime.lastError).not.toBeDefined();
        });
      } catch (e) {
          expect(e).not.toBeDefined();
      }
    });

    it('should fail to send a big msg', function(done) {
      globdone=done;
      var blob100='0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789';
      var msgdata = {};
      for(var k=0;k<41;k++){
        var key='k'+k;
        msgdata[key]=blob100;
      }
      var message = {
        'destinationId' : sender,
        'messageId' : '0',
        'timeToLive' : 10,
        'data' : msgdata
      };
      try {
        chrome.gcm.send(message, function(msgid) {
          expect('not to get there');
        });
      } catch (e) {
          expect(e.message).toBeDefined();
          expect(e.message.substring(0,16)).toEqual("Payload exceeded");
      }
      done();
    });

    // I would love to test onSendError and onMessagesDeleted

  });
});
