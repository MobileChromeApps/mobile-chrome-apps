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

var echoJNext,
    _event = require("../../lib/event"),
    winCallback = null,
    failCallback = null;
    
module.exports = {   
    doEcho: function (success, fail, args) {
        var invokeData = { "message" : JSON.parse(decodeURIComponent(args.message)) };
        try {
            success(echoJNext.getEchoJNext(invokeData));
        } catch (e) {
            fail(-1, e);
        }
    }
};

///////////////////////////////////////////////////////////////////
// JavaScript wrapper for JNEXT plugin
///////////////////////////////////////////////////////////////////

JNEXT.EchoJNext = function ()
{   
    var _self = this;

    _self.getEchoJNext = function (args) {
        return JNEXT.invoke(_self._id, "doEcho " + JSON.stringify(args));
    };

    _self.getId = function () {
        return _self._id;
    };

    _self.init = function () {
        if (!JNEXT.require("echoJnext")) {
            return false;
        }

        _self._id = JNEXT.createObject("echoJnext.Echo");

        if (!_self._id || _self._id === "") {
            return false;
        }

        JNEXT.registerEvents(_self);
    };

    _self.onEvent = function (strData) {
        var arData = strData.split(" "),
            strEventId = arData[0],
            args = arData[1],
            info = {};
            
        if (strEventId === "cordova.echo.callback") {
            _event.trigger("echoCallback", args);
        }
                  
    };
    
    _self._id = "";
    
    _self.init();
};

echoJNext = new JNEXT.EchoJNext();
