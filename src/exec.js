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
var childProcess = require('child_process');
var path = require('path');

function resolveTilde(string) {
  if (string.substr(0,1) === '~')
    return path.resolve(process.env.HOME + string.substr(1));
  return string;
}

// Returns a promise
module.exports = exports = function exec(argv) {
  argv = argv.map(resolveTilde);
  var cmd = argv[0];
  argv = argv.slice(1);
  var child = childProcess.spawn(cmd, argv, { stdio: [0,1,2] });
  child.on('close', process.exit);
};
