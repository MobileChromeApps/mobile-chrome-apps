/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var _self = {},
    _ID = require("./manifest.json").namespace,
    win = null,
    fail = null;

function handleCallback(result) {
    if (result) {
        if(win){
            win(result);
        }
    } else {
        if(fail){
            fail(result);
        }
    }
    win = null;
    fail = null;
}

_self.doEcho = function (args, theWin, theFail) {
    var data = { "message" : args.message || "" };
    
    win = theWin;
    fail = theFail;
    
    window.webworks.event.add(_ID, "echoCallback", handleCallback);
    
    return window.webworks.execSync(_ID, "doEcho", data);
};


module.exports = _self;
