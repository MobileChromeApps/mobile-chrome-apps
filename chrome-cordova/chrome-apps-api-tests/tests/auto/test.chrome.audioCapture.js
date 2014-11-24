// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

registerAutoTests("chrome.audioCapture", function() {
  'use strict';

  var customMatchers = {
    toBeMediaStreamTrack : function(util, customEqualityTesters){
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = (actual.toString() == '[object MediaStreamTrack]');
          result.message = 'Expected ' + actual + ' to be a MediaStreamTrack.';
          return result;
        }
      }
    },
    toBeString : function(util, customEqualityTesters){
      return {
        compare : function(actual, expected){
          var result = {};
          result.pass = (typeof actual == 'string');
          result.message = 'Expected ' + actual + ' to be a string.';
          return result;
        }
      }
    }
  }

  beforeEach(function(done) {
    jasmine.addMatchers(customMatchers);
    done();
  });

  function expectMediaStream(stream) {
    expect(stream).toBeDefined();
    expect(stream.id).toBeString();
    expect(stream.label).toBeString();
    expect(stream.ended).toBe(false);
    expect(stream.stop).toBeDefined();
    expect(stream.getVideoTracks).toBeDefined();
    expect(stream.getAudioTracks).toBeDefined();
  }

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

  it('should have navigator.getUserMedia', function() {
    expect(navigator.getUserMedia).toBeDefined();
  });

  if (!navigator.getUserMedia)
    return;

  it('should return a valid audio stream with no video', function(done) {
    navigator.getUserMedia({audio: true, video: false}, function(stream) {
      expectMediaStream(stream);

      var audioTracks = stream.getAudioTracks();
      expect(audioTracks).toBeMediaStreamTrack();
      expect(audioTracks.length).toBe(1);

      var videoTracks = stream.getVideoTracks();
      expect(videoTracks).toBeDefined();
      expect(videoTracks.length).toBe(0);

      done();
    }, function(error) {
      expect(error).not.toBeDefined();
      done();
    });
  });

  it('should return both valid audio and video streams', function(done) {
    navigator.getUserMedia({audio: true, video: true}, function(stream) {
      expectMediaStream(stream);

      var audioTracks = stream.getAudioTracks();
      expect(audioTracks).toBeMediaStreamTrack();
      expect(audioTracks.length).toBe(1);

      var videoTracks = stream.getVideoTracks();
      expect(videoTracks).toBeMediaStreamTrack();
      expect(videoTracks.length).toBe(1);

      done();
    }, function(error) {
      expect(error).not.toBeDefined();
      done();
    });
  });
});
