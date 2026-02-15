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

// MV3: Consulo_Preset types are needed locally for icon display
var Consulo_Preset_Types = {
    DESKTOP: { ident: 'DESKTOP', title: I18n.message('_Desktop') },
    NETBOOK: { ident: 'NETBOOK', title: I18n.message('_Netbook') },
    WIDESCREEN: { ident: 'WIDESCREEN', title: I18n.message('_Widescreen') },
    TABLET_LANDSCAPE: { ident: 'TABLET_LANDSCAPE', title: I18n.message('_TabletLandscape') },
    TABLET_PORTRAIT: { ident: 'TABLET_PORTRAIT', title: I18n.message('_TabletPortrait') },
    SMARTPHONE_LANDSCAPE: { ident: 'SMARTPHONE_LANDSCAPE', title: I18n.message('_SmartphoneLandscape') },
    SMARTPHONE_PORTRAIT: { ident: 'SMARTPHONE_PORTRAIT', title: I18n.message('_SmartphonePortrait') }
};

var Consulo_Preset_allTypes = [
    Consulo_Preset_Types.DESKTOP,
    Consulo_Preset_Types.NETBOOK,
    Consulo_Preset_Types.WIDESCREEN,
    Consulo_Preset_Types.TABLET_LANDSCAPE,
    Consulo_Preset_Types.TABLET_PORTRAIT,
    Consulo_Preset_Types.SMARTPHONE_LANDSCAPE,
    Consulo_Preset_Types.SMARTPHONE_PORTRAIT
];

function typeForIdent(ident) {
    for (var i in Consulo_Preset_allTypes) {
        if (Consulo_Preset_allTypes[i].ident === ident) {
            return Consulo_Preset_allTypes[i];
        }
    }
    return Consulo_Preset_allTypes[0];
}

/**
 * Window presets menu.
 */
var Consulo_PresetMenu = {};
Consulo_PresetMenu._container = null;
Consulo_PresetMenu._presets = null;

Consulo_PresetMenu.show = function(presets, activeTab, state) {
    this._init(activeTab);
    this._initSelectionMode(activeTab, state);
    this._initDebugInConsulo(activeTab, state);
    this._presets = presets;
    this._putPresets(this._presets, state.viewPort);
};
Consulo_PresetMenu.hide = function() {
    window.close();
};
Consulo_PresetMenu.resetPage = function() {
    var that = this;
    chrome.runtime.sendMessage({type: 'resetPageSize'}, function() {
        that.hide();
    });
};
Consulo_PresetMenu.resizePage = function(preset) {
    var that = this;
    chrome.runtime.sendMessage({type: 'resizePage', preset: preset}, function() {
        that.hide();
    });
};
Consulo_PresetMenu.setAutoPresetActive = function() {
    document.getElementById('autoPresetMenu').setAttribute('class', 'active');
    document.getElementById('autoPresetRadio').setAttribute('checked', 'checked');
};
/*** ~Private ***/
Consulo_PresetMenu._init = function(activeTab) {
    if (this._container !== null) {
        return;
    }
    this._container = document.getElementById('presetMenu');
    this._registerEvents(activeTab);
};
Consulo_PresetMenu._initSelectionMode = function(activeTab, state) {
    var selectionMode = document.getElementById('selectionModeCheckBox');
    selectionMode.checked = state.selectionMode;
    var selectionModeMenu = document.getElementById('selectionModeMenu');
    var display = state.debuggedTab === activeTab.id ? 'block' : 'none';
    selectionModeMenu.style.display = display;
    var selectionModeSeparator = document.getElementById('selectionModeSeparator');
    if (selectionModeSeparator) {
        selectionModeSeparator.style.display = display;
    }
};
Consulo_PresetMenu._initDebugInConsulo = function(activeTab, state) {
    var menu = document.getElementById('debugInConsuloMenu');
    var display = state.debuggedTab === activeTab.id ? 'none' : 'block';
    menu.style.display = display;
    var separator = document.getElementById('debugInConsuloSeparator');
    if (separator) {
        separator.style.display = display;
    }
};
Consulo_PresetMenu._registerEvents = function(activeTab) {
    var that = this;
    document.getElementById('autoPresetMenu').addEventListener('click', function() {
        that.resetPage();
    }, false);
    document.getElementById('customizePresetsMenu').addEventListener('click', function() {
        that._showPresetCustomizer();
    }, false);
    document.getElementById('selectionModeMenu').addEventListener('click', function(event) {
        that._updateSelectionMode(event.target.id !== 'selectionModeCheckBox');
    }, false);
    document.getElementById('debugInConsuloMenu').addEventListener('click', function() {
        that._debugInConsulo(activeTab);
    }, false);
};
Consulo_PresetMenu._putPresets = function(presets, viewPort) {
    var menu = document.getElementById('menuPresets');
    menu.innerHTML = '';
    if (!presets) return;
    for (var p in presets) {
        var preset = presets[p];
        var activePreset = viewPort && viewPort.width == preset.width && viewPort.height == preset.height;
        var item = document.createElement('a');
        item.setAttribute('href', '#');
        item.setAttribute('tabindex', '-1');
        item.setAttribute('title', I18n.message('_PresetTitle', [preset.displayName, preset.width, preset.height]));
        item.addEventListener('click', function(presetIndex) {
            return function() {
                Consulo_PresetMenu.resizePage(presetIndex);
            };
        } (p), false);
        if (activePreset) {
            item.setAttribute('class', 'active');
        }
        var formItemDiv = document.createElement('div');
        formItemDiv.setAttribute('class', 'form-item');
        var radio = document.createElement('input');
        radio.setAttribute('type', 'radio');
        radio.setAttribute('tabindex', '-1');
        if (activePreset) {
            radio.setAttribute('checked', 'checked');
        }
        formItemDiv.appendChild(radio);
        item.appendChild(formItemDiv);
        var presetType = typeForIdent(preset.type);
        var iconDiv = document.createElement('div');
        iconDiv.setAttribute('class', 'icon');
        var img = document.createElement('img');
        img.setAttribute('src', '../img/presets/' + presetType.ident + '.png');
        img.setAttribute('alt', presetType.title);
        img.setAttribute('title', presetType.title);
        iconDiv.appendChild(img);
        item.appendChild(iconDiv);
        var labelDiv = document.createElement('div');
        labelDiv.setAttribute('class', 'label');
        var mainLabelDiv = document.createElement('div');
        mainLabelDiv.setAttribute('class', 'main');
        mainLabelDiv.appendChild(document.createTextNode(preset.displayName));
        labelDiv.appendChild(mainLabelDiv);
        var infoLabelDiv = document.createElement('div');
        infoLabelDiv.setAttribute('class', 'info');
        infoLabelDiv.appendChild(document.createTextNode(I18n.message('_PresetWidthHeight', [preset.width, preset.height])));
        labelDiv.appendChild(infoLabelDiv);
        item.appendChild(labelDiv);
        menu.appendChild(item);
    }
};
Consulo_PresetMenu._showPresetCustomizer = function() {
    chrome.runtime.sendMessage({type: 'showPresetCustomizer'});
    this.hide();
};

Consulo_PresetMenu._updateSelectionMode = function(switchCheckBoxValue) {
    var checkbox = document.getElementById('selectionModeCheckBox');
    if (switchCheckBoxValue) {
        checkbox.checked = !checkbox.checked;
    }
    var selectionMode = checkbox.checked;
    chrome.runtime.sendMessage({type: 'setSelectionMode', selectionMode: selectionMode});
    this.hide();
};

Consulo_PresetMenu._debugInConsulo = function(activeTab) {
    chrome.runtime.sendMessage({
        type: 'attach_debugger',
        tabId: activeTab.id,
        url: activeTab.url
    });
    this.hide();
};

// run!
window.addEventListener('load', function() {
    chrome.runtime.sendMessage({type: 'detectViewPort'}, function() {
        chrome.runtime.sendMessage({type: 'getWindowInfo'}, function(winResponse) {
            var win = winResponse.window;
            var activeTab = null;
            for (var i=0; i<win.tabs.length; i++) {
                var tab = win.tabs[i];
                if (tab.active) {
                    activeTab = tab;
                    break;
                }
            }
            chrome.runtime.sendMessage({type: 'getState'}, function(state) {
                chrome.runtime.sendMessage({type: 'getPresets'}, function(presetsResponse) {
                    Consulo_PresetMenu.show(presetsResponse.presets, activeTab, state);
                    if (win.state === 'maximized') {
                        Consulo_PresetMenu.setAutoPresetActive();
                    }
                });
            });
        });
    });
}, false);
