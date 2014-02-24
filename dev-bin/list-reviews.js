//usr/bin/env node $0 $*; exit $?
/**
  Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
 */

/**
  The top line of this file will allow this script to be run as
  a UNIX shell script, as well as being a valid Node.js program.
 */

/******************************************************************************/
/******************************************************************************/

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var eventQueue = [];
var commandLineFlags = {};
var commandLineArgs = process.argv.slice(2).filter(function(arg) {
  if (arg.slice(0, 2) == '--') {
    commandLineFlags[arg.slice(2)] = true;
  }
  return arg.slice(0, 2) != '--';
});

function pump() {
  if (eventQueue.length) {
    eventQueue.shift()(pump);
  }
}

function forEachWaitForDoneAndThen(arr, handler, andthen) {
  var calls = [];
  function callnext() {
    calls.shift()();
  }
  arr.forEach(function() {
    var args = Array.prototype.slice.call(arguments);
    calls.push(function() {
      args.unshift(callnext);
      handler.apply(null, args);
    });
  });
  calls.push(andthen);
  callnext();
}

function exec(cmd, onSuccess, opt_onError, opt_silent) {
  var onError = opt_onError || function(e) {
    fatal('command failed: ' + cmd + '\n' + e);
  };
  if (!opt_silent) {
    console.log('Running: ' + cmd);
  }
  childProcess.exec(cmd, function(error, stdout, stderr) {
    if (error) {
      onError(error);
    } else {
      onSuccess(stdout.trim(), stderr.trim());
    }
  });
}

/******************************************************************************/
/******************************************************************************/

/*
 * 1. List commits that are only in the reviews branch, in reverse chronological order
 * 2. Map those commits to files touched
 * 3. Assume those files are fully reviewed up to that commit by that review patch author
 * 4. ???
 * 5. Profit
 *
 * TODO: how to know if whole file wasn't reviewed?
 * TODO: what about merged/cherry-picked patches?
 * TODO: what about files that were renamed?
 * TODO: what percentage of file has changed since last review
 * TODO: iterate over files and check diffs to master, instead of commits
 * TODO: report commit hashes for the master version
 * TODO: add setting to show all reviews not just recent, perhaps for a specific file?
 *
 */
var reviews = {};

function calculate(callback) {
  exec("git log --cherry --pretty='format:%H %aE' master..reviews", function(commits) { // format each line 'HASH EMAIL'
    commits = commits.split('\n');
    forEachWaitForDoneAndThen(commits, function(done, commit) {
      var hash = commit.substring(0,40); // 40 characters is hash length
      var author = commit.substring(41);
      exec("git diff-tree --no-commit-id --name-only -r " + hash, function(files) {
        files = files.split('\n');
        forEachWaitForDoneAndThen(files, function(done, file) {
          if (file in reviews) {
            return done();
          }
          exec("git log --date=relative --pretty='format:%ad' -n 1 " + hash, function(date) {
            var review = reviews[file] = {};
            review.hash = hash;
            review.author = author;
            review.date = date;
            done();
          }, undefined, true);
        }, done); // <-- call done after for loop
      }, undefined, true);
    }, callback); // <-- call callback after for loop
  }, undefined, true);
}

function report(callback) {
  Object.keys(reviews).forEach(function(file) {
    var review = reviews[file];
    console.log([file, review.author, review.date, review.hash].join(', '));
  });
}

(function() {
  eventQueue.push(calculate);
  eventQueue.push(report);
  pump();
}());

