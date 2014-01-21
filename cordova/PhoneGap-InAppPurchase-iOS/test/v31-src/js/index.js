/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');

        IAP.initialize();
        IAP.render = function () {
            var el = document.getElementById('in-app-purchase-list');
            if (IAP.loaded) {
                var html = "<ul>";
                console.log(IAP.list);
                console.log(IAP.products);
                var index = 0;
                var buttonStyle = "display:inline-block; padding: 5px 20px; border: 1px solid black";
                for (var id in IAP.products) {
                    var p = IAP.products[id];
                    html += "<li>" +
                        "<h3>" + p.title + "</h3>" +
                        "<p>" + p.description + "</p>" +
                        "<div style='" + buttonStyle + "' id='buy-" + index + "' productId='" + p.id + "' type='button'>" + p.price + "</div>" +
                        "</li>";
                    ++index;
                }
                html += "</ul>";
                html += "<div style='" + buttonStyle + "' id='restore'>RESTORE ALL</div>"
                el.innerHTML = html;
                while (index > 0) {
                    --index;
                    document.getElementById("buy-" + index).onclick = function (event) {
                        var pid = this.getAttribute("productId");
                        IAP.buy(pid);
                    };
                }
                document.getElementById("restore").onclick = function (event) {
                    IAP.restore();
                };
            }
            else {
                el.innerHTML = "In-App Purchases not available";
            }
        };
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};
