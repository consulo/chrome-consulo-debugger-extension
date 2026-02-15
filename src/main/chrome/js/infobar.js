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
 * Infobar.
 */
var Consulo_Infobar = {};
Consulo_Infobar._presets = null;
Consulo_Infobar._container = null;
Consulo_Infobar.show = function(presets, selectionMode) {
    this._presets = presets;
    this._init();
    this.setSelectionMode(selectionMode);
    this._showPresets();
};
Consulo_Infobar.redrawPresets = function() {
    chrome.runtime.sendMessage({type: 'getPresets'}, function(presetsResponse) {
        Consulo_Infobar.show(presetsResponse.presets, false);
    });
};
Consulo_Infobar._init = function() {
    if (this._container !== null) {
        return;
    }
    this._container = document.getElementById('presets');
    this._registerEvents();
};
Consulo_Infobar._registerEvents = function() {
    var that = this;
    document.getElementById('autoPresetButton').addEventListener('click', function() {
        chrome.runtime.sendMessage({type: 'resetPageSize'});
    }, false);
    document.getElementById('presetCustomizerButton').addEventListener('click', function() {
        chrome.runtime.sendMessage({type: 'showPresetCustomizer'});
    }, false);
    document.getElementById('selectionModeCheckBox').addEventListener('click', function() {
        that._updateSelectionMode(false);
    }, false);
    document.getElementById('selectionModeMenu').addEventListener('click', function() {
        that._updateSelectionMode(true);
    }, false);
};
Consulo_Infobar._showPresets = function() {
    this._container.innerHTML = '';
    if (!this._presets) return;
    for (var p in this._presets) {
        var preset = this._presets[p];
        if (!preset.showInToolbar) {
            continue;
        }
        var button = document.createElement('a');
        button.setAttribute('href', '#');
        button.setAttribute('class', 'button');
        button.setAttribute('title', preset.displayName + ' (' + preset.width + ' x ' + preset.height + ')');
        button.addEventListener('click', function(presetIndex) {
            return function() {
                chrome.runtime.sendMessage({type: 'resizePage', preset: presetIndex});
            };
        } (p), false);
        button.appendChild(document.createTextNode(preset.displayName));
        this._container.appendChild(button);
    }
};

Consulo_Infobar._updateSelectionMode = function(switchCheckBoxValue) {
    var checkbox = document.getElementById('selectionModeCheckBox');
    if (switchCheckBoxValue) {
        checkbox.checked = !checkbox.checked;
    }
    var selectionMode = checkbox.checked;
    chrome.runtime.sendMessage({type: 'setSelectionMode', selectionMode: selectionMode});
};

Consulo_Infobar.setSelectionMode = function(selectionMode) {
    var checkbox = document.getElementById('selectionModeCheckBox');
    checkbox.checked = selectionMode;
};

// run!
window.addEventListener('load', function() {
    chrome.runtime.sendMessage({type: 'getState'}, function(state) {
        chrome.runtime.sendMessage({type: 'getPresets'}, function(presetsResponse) {
            Consulo_Infobar.show(presetsResponse.presets, state.selectionMode);
        });
    });
}, false);
