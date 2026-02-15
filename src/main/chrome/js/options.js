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

// MV3: local preset type definitions (no access to background page)
var Consulo_Preset_allTypes = [
    { ident: 'DESKTOP', title: I18n.message('_Desktop') },
    { ident: 'NETBOOK', title: I18n.message('_Netbook') },
    { ident: 'WIDESCREEN', title: I18n.message('_Widescreen') },
    { ident: 'TABLET_LANDSCAPE', title: I18n.message('_TabletLandscape') },
    { ident: 'TABLET_PORTRAIT', title: I18n.message('_TabletPortrait') },
    { ident: 'SMARTPHONE_LANDSCAPE', title: I18n.message('_SmartphoneLandscape') },
    { ident: 'SMARTPHONE_PORTRAIT', title: I18n.message('_SmartphonePortrait') }
];

function typeForIdent(ident) {
    for (var i in Consulo_Preset_allTypes) {
        if (Consulo_Preset_allTypes[i].ident === ident) {
            return Consulo_Preset_allTypes[i];
        }
    }
    console.error('Type not found for ident: ' + ident);
    return Consulo_Preset_allTypes[0];
}

// MV3: state is fetched from background via messaging
var INFOBAR = false;

/**
 * Preset customizer.
 */
var Consulo_PresetCustomizer = {};
Consulo_PresetCustomizer._container = null;
Consulo_PresetCustomizer._moreHelpButton = null;
Consulo_PresetCustomizer._rowContainer = null;
Consulo_PresetCustomizer._addPresetButton = null;
Consulo_PresetCustomizer._removePresetButton = null;
Consulo_PresetCustomizer._moveUpPresetButton = null;
Consulo_PresetCustomizer._moveDownPresetButton = null;
Consulo_PresetCustomizer._okButton = null;
Consulo_PresetCustomizer._resetWarningsButton = null;
Consulo_PresetCustomizer._presets = null;
Consulo_PresetCustomizer._activePreset = null;
Consulo_PresetCustomizer.show = function(presets) {
    this._init();
    this._presets = presets;
    this._putPresets(this._presets);
};
/*** ~Private ***/
Consulo_PresetCustomizer._init = function() {
    if (this._rowContainer !== null) {
        return;
    }
    if (!INFOBAR) {
        document.getElementById('toolbarHeader').style.display = 'none';
    }
    this._moreHelpButton = document.getElementById('moreHelpButton');
    this._rowContainer = document.getElementById('presetCustomizerTable').getElementsByTagName('tbody')[0];
    this._addPresetButton = document.getElementById('addPreset');
    this._removePresetButton = document.getElementById('removePreset');
    this._moveUpPresetButton = document.getElementById('moveUpPreset');
    this._moveDownPresetButton = document.getElementById('moveDownPreset');
    this._okButton = document.getElementById('presetCustomizerOk');
    this._resetWarningsButton = document.getElementById('resetWarnings');
    this._registerEvents();
};
Consulo_PresetCustomizer._hide = function() {
    window.close();
};
Consulo_PresetCustomizer._registerEvents = function() {
    var that = this;
    this._moreHelpButton.addEventListener('click', function() {
        that._switchHelp();
    }, false);
    this._addPresetButton.addEventListener('click', function() {
        that._addPreset();
    }, false);
    this._removePresetButton.addEventListener('click', function() {
        that._removePreset();
    }, false);
    this._moveUpPresetButton.addEventListener('click', function() {
        that._moveUpPreset();
    }, false);
    this._moveDownPresetButton.addEventListener('click', function() {
        that._moveDownPreset();
    }, false);
    this._okButton.addEventListener('click', function() {
        that._save();
    }, false);
    document.getElementById('presetCustomizerCancel').addEventListener('click', function() {
        that._cancel();
    }, false);
    this._resetWarningsButton.addEventListener('click', function() {
        that._resetWarnings();
    }, false);
};
Consulo_PresetCustomizer._putPresets = function(presets) {
    if (this._presets === null) {
        this._putNoPresets();
        this._enableButtons();
    } else {
        this._putPresetsInternal(presets);
    }
};
Consulo_PresetCustomizer._putNoPresets = function() {
    var row = document.createElement('tr');
    var info = document.createElement('td');
    info.setAttribute('colspan', '5');
    info.setAttribute('class', 'info');
    info.appendChild(document.createTextNode(I18n.message('_WindowSettingsNotAvailable')));
    row.appendChild(info);
    this._rowContainer.appendChild(row);
};
Consulo_PresetCustomizer._putPresetsInternal = function(presets) {
    var that = this;
    for (var p in presets) {
        var preset = presets[p];
        var row = document.createElement('tr');
        row.addEventListener('click', function() {
            that._rowSelected(this);
        }, true);
        // type
        var type = document.createElement('td');
        var typeSelect = document.createElement('select');
        for (var i in Consulo_Preset_allTypes) {
            var presetType = Consulo_Preset_allTypes[i];
            var option = document.createElement('option');
            option.setAttribute('value', presetType.ident);
            if (preset.type === presetType.ident) {
                option.setAttribute('selected', 'selected');
            }
            option.appendChild(document.createTextNode(presetType.title));
            typeSelect.appendChild(option);
        }
        typeSelect.addEventListener('change', function() {
            that._typeChanged(this);
        }, false);
        type.appendChild(typeSelect);
        row.appendChild(type);
        // name
        var title = document.createElement('td');
        var titleInput = document.createElement('input');
        titleInput.setAttribute('value', preset.displayName);
        titleInput.addEventListener('keyup', function() {
            that._titleChanged(this);
        }, false);
        title.appendChild(titleInput);
        row.appendChild(title);
        // width
        var witdh = document.createElement('td');
        var widthInput = document.createElement('input');
        widthInput.setAttribute('value', preset.width);
        widthInput.className = 'number';
        widthInput.addEventListener('keyup', function() {
            that._widthChanged(this);
        }, false);
        witdh.appendChild(widthInput);
        row.appendChild(witdh);
        // height
        var height = document.createElement('td');
        var heightInput = document.createElement('input');
        heightInput.setAttribute('value', preset.height);
        heightInput.className = 'number';
        heightInput.addEventListener('keyup', function() {
            that._heightChanged(this);
        }, false);
        height.appendChild(heightInput);
        row.appendChild(height);
        // toolbar
        if (INFOBAR) {
            var toolbar = document.createElement('td');
            toolbar.setAttribute('class', 'toolbar');
            var toolbarCheckbox = document.createElement('input');
            toolbarCheckbox.setAttribute('type', 'checkbox');
            if (preset.showInToolbar) {
                toolbarCheckbox.setAttribute('checked', 'checked');
            }
            toolbarCheckbox.addEventListener('click', function() {
                that._toolbarChanged(this);
            }, false);
            toolbar.appendChild(toolbarCheckbox);
            row.appendChild(toolbar);
        }
        this._rowContainer.appendChild(row);
        preset['_row'] = row;
        preset['_errors'] = [];
    }
};
Consulo_PresetCustomizer._cleanUp = function() {
    this._presets = null;
    while (this._rowContainer.hasChildNodes()) {
        this._rowContainer.removeChild(this._rowContainer.firstChild);
    }
    this._activePreset = null;
    this._enableButtons();
};
Consulo_PresetCustomizer._addPreset = function() {
    var preset = {
        type: Consulo_Preset_allTypes[0].ident,
        displayName: I18n.message('_New_hellip'),
        width: '800',
        height: '600',
        showInToolbar: true,
        isDefault: false
    };
    this._presets.push(preset);
    this._putPresets([preset]);
    this._enableButtons();
};
Consulo_PresetCustomizer._removePreset = function() {
    this._presets.splice(this._presets.indexOf(this._activePreset), 1);
    this._rowContainer.removeChild(this._activePreset['_row']);
    this._activePreset = null;
    this._enableButtons();
};
Consulo_PresetCustomizer._moveUpPreset = function() {
    this._movePreset(this._activePreset, -1);
    var row = this._activePreset['_row'];
    var before = row.previousSibling;
    this._rowContainer.removeChild(row);
    this._rowContainer.insertBefore(row, before);
    this._enableButtons();
};
Consulo_PresetCustomizer._moveDownPreset = function() {
    this._movePreset(this._activePreset, +1);
    var row = this._activePreset['_row'];
    var after = row.nextSibling;
    this._rowContainer.removeChild(row);
    nbInsertAfter(row, after);
    this._enableButtons();
};
Consulo_PresetCustomizer._movePreset = function(preset, shift) {
    var index = this._presets.indexOf(preset);
    var tmp = this._presets[index];
    this._presets[index] = this._presets[index + shift];
    this._presets[index + shift] = tmp;
};
Consulo_PresetCustomizer._save = function() {
    for (var i in this._presets) {
        var preset = this._presets[i];
        delete preset['_row'];
        delete preset['_errors'];
    }
    // MV3: send presets to background via messaging
    chrome.runtime.sendMessage({type: 'setPresets', presets: this._presets});
    this._cleanUp();
    this._hide();
};
Consulo_PresetCustomizer._cancel = function() {
    this._cleanUp();
    this._hide();
};
Consulo_PresetCustomizer._switchHelp = function() {
    var help = document.getElementById('help');
    var displayed = help.style.display == 'block';
    help.style.display = displayed ? 'none' : 'block';
    this._moreHelpButton.innerHTML = I18n.message(displayed ? '_More_hellip' : '_Less_hellip');
};
Consulo_PresetCustomizer._resetWarnings = function() {
    chrome.runtime.sendMessage({type: 'resetWarnings'});
    this._resetWarningsButton.innerHTML = I18n.message('_Done');
    this._resetWarningsButton.setAttribute('disabled', 'disabled');
};
Consulo_PresetCustomizer._rowSelected = function(row) {
    if (this._activePreset !== null) {
        if (this._activePreset['_row'] === row) {
            return;
        }
        this._activePreset['_row'].className = '';
    }
    var that = this;
    for (var i in this._presets) {
        var preset = this._presets[i];
        if (preset['_row'] === row) {
            that._activePreset = preset;
            that._activePreset['_row'].className = 'active';
        }
    }
    this._enableButtons();
};
Consulo_PresetCustomizer._enableButtons = function() {
    this._enablePresetButtons();
    this._enableMainButtons();
};
Consulo_PresetCustomizer._enablePresetButtons = function() {
    if (this._activePreset !== null) {
        if (this._activePreset.isDefault) {
            this._removePresetButton.setAttribute('disabled', 'disabled');
        } else {
            this._removePresetButton.removeAttribute('disabled');
        }
        if (this._activePreset['_row'] !== this._rowContainer.firstChild) {
            this._moveUpPresetButton.removeAttribute('disabled');
        } else {
            this._moveUpPresetButton.setAttribute('disabled', 'disabled');
        }
        if (this._activePreset['_row'] !== this._rowContainer.lastChild) {
            this._moveDownPresetButton.removeAttribute('disabled');
        } else {
            this._moveDownPresetButton.setAttribute('disabled', 'disabled');
        }
    } else {
        if (this._presets === null) {
            this._addPresetButton.setAttribute('disabled', 'disabled');
        }
        this._removePresetButton.setAttribute('disabled', 'disabled');
        this._moveUpPresetButton.setAttribute('disabled', 'disabled');
        this._moveDownPresetButton.setAttribute('disabled', 'disabled');
    }
};
Consulo_PresetCustomizer._enableMainButtons = function() {
    var anyError = false;
    if (this._presets === null) {
        anyError = true;
    } else {
        for (var i in this._presets) {
            if (this._presets[i]['_errors'].length) {
                anyError = true;
                break;
            }
        }
    }
    if (anyError) {
        this._okButton.setAttribute('disabled', 'disabled');
    } else {
        this._okButton.removeAttribute('disabled');
    }
};
Consulo_PresetCustomizer._typeChanged = function(input) {
    if (this._activePreset === null) {
        var row = input;
        while (true) {
            row = row.parentNode;
            if (row.tagName.toLowerCase() === 'tr') {
                break;
            }
        }
        this._rowSelected(row);
    }
    this._activePreset.type = typeForIdent(input.value).ident;
};
Consulo_PresetCustomizer._titleChanged = function(input) {
    var that = this;
    this._checkField(input, 'displayName', function(value) {
        return that._validateNotEmpty(value);
    });
};
Consulo_PresetCustomizer._widthChanged = function(input) {
    var that = this;
    this._checkField(input, 'width', function(value) {
        return that._validateNumber(value);
    });
};
Consulo_PresetCustomizer._heightChanged = function(input) {
    var that = this;
    this._checkField(input, 'height', function(value) {
        return that._validateNumber(value);
    });
};
Consulo_PresetCustomizer._toolbarChanged = function(input) {
    this._activePreset.showInToolbar = input.checked;
};
Consulo_PresetCustomizer._validateNotEmpty = function(value) {
    return value != null && value.trim().length > 0;
};
Consulo_PresetCustomizer._validateNumber = function(value) {
    return value != null && value.search(/^[1-9][0-9]*$/) != -1;
};
Consulo_PresetCustomizer._checkField = function(input, key, validation) {
    var value = input.value;
    var index = this._activePreset['_errors'].indexOf(key);
    if (validation(value)) {
        nbRemoveCssClass(input, 'error');
        if (index !== -1) {
            this._activePreset['_errors'].splice(index, 1);
        }
    } else {
        nbAddCssClass(input, 'error');
        if (index === -1) {
            this._activePreset['_errors'].push(key);
        }
    }
    this._activePreset[key] = value;
    this._enableMainButtons();
};

/*** ~Helpers ***/
function nbInsertAfter(newElement, targetElement) {
	var parent = targetElement.parentNode;
	if (parent.lastchild === targetElement) {
		parent.appendChild(newElement);
    } else {
		parent.insertBefore(newElement, targetElement.nextSibling);
    }
}
function nbAddCssClass(element, cssClass) {
    var className = element.className;
    if (className.indexOf(cssClass) !== -1) {
        return;
    }
    element.className = (element.className.trim() + ' ' + cssClass);
}
function nbRemoveCssClass(element, cssClass) {
    element.className = element.className.replace(cssClass, '').trim();
}

// run!
window.addEventListener('load', function() {
    // MV3: get state then presets via messaging
    chrome.runtime.sendMessage({type: 'getState'}, function(state) {
        INFOBAR = state.INFOBAR;
        chrome.runtime.sendMessage({type: 'getPresets', copy: true}, function(presetsResponse) {
            Consulo_PresetCustomizer.show(presetsResponse.presets);
        });
    });
}, false);
