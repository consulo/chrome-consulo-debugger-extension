/*
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
 */

// MV3: No access to background page, use messaging

/**
 * Warning - the content is set by the URL ident (accessible via window.location.hash).
 */
var Consulo_Warning = {};

Consulo_Warning._ident = null;
Consulo_Warning._okButton = null;
Consulo_Warning._doNotShowAgainButton = null;

Consulo_Warning.init = function() {
    if (Consulo_Warning._ident !== null) {
        return;
    }
    this._ident = window.location.hash.substring(1);
    this._okButton = document.getElementById('okButton');
    this._doNotShowAgainButton = document.getElementById('doNotShowAgainCheck');
    this._showContent();
    this._registerEvents();
};
Consulo_Warning._showContent = function() {
    document.getElementById(this._ident).style.display = 'block';
};
Consulo_Warning._registerEvents = function() {
    var that = this;
    this._okButton.addEventListener('click', function() {
        that._close();
    }, false);
};
Consulo_Warning._close = function() {
    this._doNotShowAgain();
    window.close();
};
Consulo_Warning._doNotShowAgain = function() {
    chrome.runtime.sendMessage({
        type: 'enableWarning',
        ident: this._ident,
        enabled: !this._doNotShowAgainButton.checked
    });
};

// run!
window.addEventListener('load', function() {
    Consulo_Warning.init();
}, false);
