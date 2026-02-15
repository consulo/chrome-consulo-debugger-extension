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

// =============================================
// I18n (minimal for service worker)
// =============================================
var I18n = {
    message: function(messageKey, substitutions) {
        return chrome.i18n.getMessage(messageKey, substitutions);
    }
};

// =============================================
// common.js - Core extension logic
// =============================================

var Consulo = {};

Consulo.serverURL = function() {
    var serverProtocol = 'ws';
    var serverHost = '127.0.0.1';
    var serverPort = 62242;
    var serverFile = '/';
    return serverProtocol+'://'+serverHost+':'+serverPort+serverFile;
};

Consulo.DEBUG = true;
Consulo.INFOBAR = false;

// Version that the extension reports to the IDE in 'init' message
Consulo.VERSION = "1.0";
// The last version that the IDE reported to the extension
Consulo.ideVersion = null;

Consulo.managedTabs = {};

Consulo.STATUS_NEW = 0;
Consulo.STATUS_UNCONFIRMED = 1;
Consulo.STATUS_MANAGED = 2;
Consulo.STATUS_NOT_MANAGED = 3;

Consulo.selectionMode = false;
Consulo.synchronizeSelection = false;
Consulo.pageInspectionListeners = [];

Consulo.tabStatus = function(tabId) {
    var tabInfo = this.managedTabs[tabId];
    var status;
    if (tabInfo === undefined) {
        status = this.STATUS_NOT_MANAGED;
    } else {
        status = tabInfo.status;
    }
    return status;
};

Consulo.cleanup = function() {
    this.socket = null;
    this.socketReady = false;
    this.pendingMessages = [];
};

Consulo.connectIfNeeded = function() {
    if (this.socket === null) {
        var self = this;
        this.socket = new WebSocket(this.serverURL());
        this.socket.onerror = function(e) {
            console.log('Socket error!');
            if (e.name && e.message) {
                console.log(e.name + ': ' + e.message);
            }
            self.cleanup();
        };
        this.socket.onclose = function() {
            self.cleanup();
        };
        this.socket.onopen = function() {
            self.socketReady = true;
            self.sendPendingMessages();
        };
        this.socket.onmessage = function(e) {
            if (Consulo.DEBUG) {
                console.log('Received message: ' + e.data);
            }
            var message;
            try {
                message = JSON.parse(e.data);
            } catch (err) {
                console.log('Message not in JSON format!');
                console.log(err);
                console.log(e.data);
                return;
            }
            self.processMessage(message);
        };
    }
    return this.socketReady;
};

Consulo.sendMessage = function(message) {
    if (this.connectIfNeeded()) {
        var messageText = JSON.stringify(message);
        if (this.DEBUG) {
            console.log('Sent message: ' + messageText);
        }
        this.socket.send(messageText);
    } else {
        this.pendingMessages.push(message);
    }
};

Consulo.sendReadyMessage = function(version) {
    this.sendMessage({
        message: 'ready',
        version: version
    });
};

Consulo.sendInitMessage = function(tab) {
    this.sendMessage({
        message: 'init',
        url: tab.url,
        tabId: tab.id,
        version: this.VERSION
    });
};

Consulo.sendCloseMessage = function(tabId) {
    this.sendMessage({
        message: 'close',
        tabId: tabId
    });
};

Consulo.sendUrlChangeMessage = function(tabId, url) {
    this.sendMessage({
        message: 'urlchange',
        tabId: tabId,
        url: url
    });
};

Consulo.sendLoadResizeOptionsMessage = function() {
    // XXX message sent more than once
    if (ResizeOptions !== null) {
        return;
    }
    this.sendMessage({
        message: 'load_resize_options'
    });
};

Consulo.sendSaveResizeOptionsMessage = function(presets) {
    ResizeOptions = presets;
    this.sendMessage({
        message: 'save_resize_options',
        resizeOptions: ResizeOptions
    });
};

Consulo.sendSelectionModeMessage = function(selectionMode) {
    this.sendMessage({
        message: 'selection_mode',
        selectionMode: selectionMode
    });
};

Consulo.sendPendingMessages = function() {
    for (var i=0; i<this.pendingMessages.length; i++) {
        this.sendMessage(this.pendingMessages[i]);
    }
    this.pendingMessages = [];
};

// MV3: use chrome.runtime.onMessage instead of chrome.extension.onMessage
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.event == "onResourceContentCommitted") {
      console.log('Sending changes from CDT back to Consulo');
      Consulo.sendResourceChangedInCDT(request.resource, request.content);
    }
    // Handle messages from popup/options/infobar/warning pages
    if (request.type === 'getState') {
        sendResponse({
            selectionMode: Consulo.selectionMode,
            synchronizeSelection: Consulo.synchronizeSelection,
            debuggedTab: Consulo.debuggedTab,
            ideVersion: Consulo.ideVersion,
            INFOBAR: Consulo.INFOBAR,
            resizeOptions: ResizeOptions,
            viewPort: Consulo_ViewPort
        });
        return true;
    }
    if (request.type === 'getPresets') {
        sendResponse({
            presets: Consulo_Presets.getPresets(request.copy || false)
        });
        return true;
    }
    if (request.type === 'setPresets') {
        Consulo_Presets.setPresets(request.presets);
        sendResponse({ok: true});
        return true;
    }
    if (request.type === 'setSelectionMode') {
        Consulo.setSelectionMode(request.selectionMode);
        sendResponse({ok: true});
        return true;
    }
    if (request.type === 'resetPageSize') {
        Consulo.resetPageSize(function() {
            sendResponse({ok: true});
        });
        return true;
    }
    if (request.type === 'resizePage') {
        Consulo.resizePage(request.preset, function() {
            sendResponse({ok: true});
        });
        return true;
    }
    if (request.type === 'detectViewPort') {
        Consulo.detectViewPort(function() {
            sendResponse({viewPort: Consulo_ViewPort});
        });
        return true;
    }
    if (request.type === 'getWindowInfo') {
        Consulo.getWindowInfo(function(win) {
            sendResponse({window: win});
        });
        return true;
    }
    if (request.type === 'showPresetCustomizer') {
        Consulo.showPresetCustomizer();
        sendResponse({ok: true});
        return true;
    }
    if (request.type === 'sendInspectMessage') {
        Consulo.sendMessage({
            message: 'inspect',
            tabId: request.tabId,
            url: request.url
        });
        sendResponse({ok: true});
        return true;
    }
    if (request.type === 'resetWarnings') {
        Consulo_Warnings.reset();
        sendResponse({ok: true});
        return true;
    }
    if (request.type === 'enableWarning') {
        Consulo_Warnings.enable(request.ident, request.enabled);
        sendResponse({ok: true});
        return true;
    }
  });

Consulo.sendResourceChangedInCDT = function(url, content) {
    this.sendMessage({
        message: 'resource_changed',
        resource: url,
        content: content
    });
};

Consulo.processMessage = function(message) {
    var type = message.message;
    if (type === 'init') {
        this.processInitMessage(message);
    } else if (type === 'reload') {
        this.processReloadMessage(message);
    } else if (type === 'close') {
        this.processCloseMessage(message);
    } else if (type === 'attach_debugger') {
        this.selectionMode = false;
        this.processAttachDebuggerMessage(message);
    } else if (type === 'detach_debugger') {
        this.processDetachDebuggerMessage(message);
    } else if (type === 'debugger_command') {
        this.processDebuggerCommandMessage(message);
    } else if (type === 'load_resize_options') {
        this.processLoadResizeOptionsMessage(message);
    } else if (type === 'save_resize_options') {
        this.processSaveResizeOptionsMessage(message);
    } else if (type === 'pageInspectionPropertyChange') {
        this.processPageInspectionPropertyChange(message);
    } else {
        console.log('Unsupported message!');
        console.log(message);
    }
};

Consulo.tabIdFromMessage = function(message) {
    var tabIdValue = message.tabId;
    var tabId;
    if (typeof(tabIdValue) === 'number') {
        tabId = tabIdValue;
    } else if (typeof(tabIdValue) === 'string') {
        tabId = parseInt(tabIdValue);
    } else {
        console.log('Missing/incorrect tabId attribute!');
        console.log(message);
    }
    return tabId;
};

Consulo.processInitMessage = function(message) {
    var tabId = this.tabIdFromMessage(message);
    if (tabId !== undefined) {
        var tabInfo = this.managedTabs[tabId];
        if (tabInfo === undefined) {
            console.log('Ignoring init message for an unknown tab: '+tabId);
        } else if (tabInfo.status === this.STATUS_UNCONFIRMED) {
            if (message.status === 'accepted') {
                // Tab should be managed
                Consulo.ideVersion = message.version;
                if (tabInfo.closed) {
                    // Delayed confirmation request for already closed tab;
                    // for a tab whose URL changed
                    this.sendCloseMessage(tabId);
                    delete this.managedTabs[tabId];
                } else {
                    tabInfo.status = this.STATUS_MANAGED;
                    this.showPageIcon(tabId);
                    this.createContextMenu(tabId, tabInfo.url);
                }
            } else {
                // Tab shouldn't be managed
                delete this.managedTabs[tabId];
            }
        } else {
            console.log('Ignoring init message for a tab for which such message was not requested: '+tabId);
        }
    }
};

Consulo.processReloadMessage = function(message) {
    var tabId = this.tabIdFromMessage(message);
    if (tabId !== undefined) {
        var status = this.tabStatus(tabId);
        if (status === this.STATUS_MANAGED) {
            this.browserReloadCallback(tabId, message.url);
        } else {
            console.log('Refusing to reload tab that is not managed: '+tabId);
        }
    }
};

Consulo.processCloseMessage = function(message) {
    var tabId = this.tabIdFromMessage(message);
    if (tabId !== undefined) {
        var status = this.tabStatus(tabId);
        if (status === this.STATUS_MANAGED) {
            this.browserCloseCallback(tabId);
        } else {
            console.log('Refusing to close tab that is not managed: '+tabId);
        }
    }
};

Consulo.processAttachDebuggerMessage = function(message) {
    var tabId = this.tabIdFromMessage(message);
    if (tabId !== undefined) {
        var status = this.tabStatus(tabId);
        if (status === this.STATUS_MANAGED) {
            this.browserAttachDebugger(tabId);
        } else {
            console.log('Refusing to attach debugger to tab that is not managed: '+tabId);
        }
    }
};

Consulo.processDetachDebuggerMessage = function(message) {
    var tabId = this.tabIdFromMessage(message);
    if (tabId !== undefined) {
        var status = this.tabStatus(tabId);
        if (status === this.STATUS_MANAGED) {
            this.browserDetachDebugger(tabId);
        } else {
            console.log('Refusing to dettach debugger from tab that is not managed: '+tabId);
        }
    }
};

Consulo.processDebuggerCommandMessage = function(message) {
    var tabId = this.tabIdFromMessage(message);
    if (tabId !== undefined) {
        var status = this.tabStatus(tabId);
        if (status === this.STATUS_MANAGED) {
            var command = message.command;
            this.browserSendCommand(tabId, command.id, command.method, command.params);
        } else {
            console.log('Refusing to send debugger command to tab that is not managed: '+tabId);
        }
    }
};

Consulo.processLoadResizeOptionsMessage = function(message) {
    ResizeOptions = JSON.parse(message.resizeOptions);
};

Consulo.processSaveResizeOptionsMessage = function(message) {
    this.sendMessage({
        message: 'save_resize_options',
        resizeOptions: message.resizeOptions
    });
};

Consulo.processPageInspectionPropertyChange = function(message) {
    var name = message.propertyName;
    var value = message.propertyValue;
    if (name === 'selectionMode') {
        this.selectionMode = value;
    } else if (name === 'synchronizeSelection') {
        this.synchronizeSelection = value;
    }
    for (var i=0; i<this.pageInspectionListeners.length; i++) {
        this.pageInspectionListeners[i]({
            name: name,
            value: value
        });
    }
};

Consulo.addPageInspectionPropertyListener = function(listener) {
    this.pageInspectionListeners.push(listener);
};

Consulo.sendDebuggingResponse = function(tabId, response) {
    this.sendMessage({
        message: 'debugger_command_response',
        tabId: tabId,
        response : response
    });
};

Consulo.sendDebuggerDetached = function(tabId) {
    this.sendMessage({
        message: 'debugger_detached',
        tabId: tabId
    });
};


Consulo.tabCreated = function(tabId) {
    this.managedTabs[tabId] = {status: this.STATUS_NEW};
};

Consulo.tabUpdated = function(tab) {
    var status = this.tabStatus(tab.id);
    var tabInfo = this.managedTabs[tab.id];
    if (status === this.STATUS_NEW) {
        tabInfo.status = this.STATUS_UNCONFIRMED;
        tabInfo.url = tab.url;
        // Send URL to IDE - ask if the tab is managed
        this.sendInitMessage(tab);
        this.sendLoadResizeOptionsMessage();
    } else if (tabInfo !== undefined) {
        if (status === this.STATUS_UNCONFIRMED) {
            // Navigation in an unconfirmed tab
            // Confirmation may be delayed; do nothing for now
        } else if (status === this.STATUS_MANAGED) {
            // Navigation in a managed tab => send "urlchange" message
            if (tabInfo.url !== tab.url) {
                this.sendUrlChangeMessage(tab.id, tab.url);
                tabInfo.url = tab.url;
            }
            this.showPageIcon(tab.id);
            this.createContextMenu(tab.id, tab.url);
            if (this.INFOBAR) {
                this.showInfoBar(tab.id);
            }
        }
    }
};

Consulo.tabRemoved = function(tabId) {
    var status = this.tabStatus(tabId);
    if (status === this.STATUS_UNCONFIRMED) {
        // Unconfirmed tab was closed
        this.managedTabs[tabId].closed = true;
    } else if (status === this.STATUS_MANAGED) {
        // Managed tab was closed => send "closed" message
        this.sendCloseMessage(tabId);
    }
    if (status !== this.STATUS_UNCONFIRMED) {
        delete this.managedTabs[tabId];
    }
};

Consulo.setSelectionMode = function(selectionMode) {
    this.selectionMode = selectionMode;
    this.sendSelectionModeMessage(selectionMode);
};

Consulo.getSelectionMode = function() {
    return this.selectionMode;
};

Consulo.getSynchronizeSelection = function() {
    return this.synchronizeSelection;
};

/**
 * Class representing window preset.
 */
function Consulo_Preset(type, displayName, width, height, showInToolbar, isDefault) {
    this.type = type;
    this.displayName = displayName;
    this.width = width;
    this.height = height;
    this.showInToolbar = showInToolbar;
    this.isDefault = isDefault;
}
Consulo_Preset.DESKTOP = {
    ident: 'DESKTOP',
    title: I18n.message('_Desktop')
};
Consulo_Preset.NETBOOK = {
    ident: 'NETBOOK',
    title: I18n.message('_Netbook')
};
Consulo_Preset.WIDESCREEN = {
    ident: 'WIDESCREEN',
    title: I18n.message('_Widescreen')
};
Consulo_Preset.TABLET_LANDSCAPE = {
    ident: 'TABLET_LANDSCAPE',
    title: I18n.message('_TabletLandscape')
};
Consulo_Preset.TABLET_PORTRAIT = {
    ident: 'TABLET_PORTRAIT',
    title: I18n.message('_TabletPortrait')
};
Consulo_Preset.SMARTPHONE_LANDSCAPE = {
    ident: 'SMARTPHONE_LANDSCAPE',
    title: I18n.message('_SmartphoneLandscape')
};
Consulo_Preset.SMARTPHONE_PORTRAIT = {
    ident: 'SMARTPHONE_PORTRAIT',
    title: I18n.message('_SmartphonePortrait')
};
Consulo_Preset.allTypes = function() {
    return [
        Consulo_Preset.DESKTOP,
        Consulo_Preset.NETBOOK,
        Consulo_Preset.WIDESCREEN,
        Consulo_Preset.TABLET_LANDSCAPE,
        Consulo_Preset.TABLET_PORTRAIT,
        Consulo_Preset.SMARTPHONE_LANDSCAPE,
        Consulo_Preset.SMARTPHONE_PORTRAIT
    ];
};
Consulo_Preset.typeForIdent = function(ident) {
    var allTypes = Consulo_Preset.allTypes();
    for (var i in allTypes) {
        if (allTypes[i].ident === ident) {
            return allTypes[i];
        }
    }
    console.error('Type not found for ident: ' + ident);
    return allTypes[0];
};

/**
 * Window presets manager.
 */
var Consulo_Presets = {};
Consulo_Presets._presets = null;
Consulo_Presets._preset = null;
Consulo_Presets.getPreset = function(preset) {
    if (preset === undefined) {
        return this._preset;
    }
    var tmp = this.getPresets()[preset];
    if (tmp === undefined) {
        return null;
    }
    this._preset = tmp;
    return this._preset;
};
Consulo_Presets.getPresets = function(copy) {
    if (copy) {
        return this._loadPresets();
    }
    if (this._presets === null) {
        this._presets = this._loadPresets();
    }
    return this._presets;
};
Consulo_Presets.setPresets = function(presets) {
    this._presets = presets;
    this._savePresets();
    this.presetsChanged();
};
Consulo_Presets._loadPresets = function() {
    if (ResizeOptions === null) {
        return null;
    }
    console.log('Mapping window presets from Consulo');
    var presets = [];
    for (var i in ResizeOptions) {
        var option = ResizeOptions[i];
        presets.push(new Consulo_Preset(
            option.type,
            option.displayName,
            option.width,
            option.height,
            option.showInToolbar,
            option.isDefault
        ));
    }
    return presets;
};
Consulo_Presets._savePresets = function() {
    console.log('Saving window presets back to Consulo');
    Consulo.sendSaveResizeOptionsMessage(this._presets);
};

/**
 * Viewport (so browser window can be correctly resized).
 */
var Consulo_ViewPort = {
    width: -1,
    height: -1,
    marginWidth: 0,
    marginHeight: 0,
    isMac: false
};

/**
 * Resize options (a.k.a. Windows Presets from Consulo).
 */
var ResizeOptions = null;

// =============================================
// chrome.js - Background page initialization
// =============================================

// Initialization/cleanup
Consulo.cleanup();

// Notify IDE that the extension has been installed/updated
chrome.runtime.onInstalled.addListener(function() {
    var manifest = chrome.runtime.getManifest();
    var version = manifest.version;
    Consulo.sendReadyMessage(version);
});

// Register reload-callback
Consulo.browserReloadCallback = function(tabId, newUrl) {
    if (newUrl !== undefined) {
        chrome.tabs.get(tabId, function(tab) {
            if (tab.url === newUrl) {
                chrome.tabs.reload(tabId, {bypassCache: true});
            } else {
                chrome.tabs.update(tabId, {url: newUrl});
            }
        });
    } else {
        chrome.tabs.reload(tabId, {bypassCache: true});
    }
};

Consulo.browserCloseCallback = function(tabId) {
    chrome.tabs.remove(tabId);
};

Consulo.debuggedTab = null;
Consulo.windowWithDebuggedTab = null;
Consulo.browserAttachDebugger = function(tabId) {
    if (Consulo.DEBUG) {
        console.log('debugger attach for tab ' + tabId);
    }
    chrome.debugger.attach({tabId : tabId}, "1.0", function(){
        var err = chrome.runtime.lastError;
        if (err) {
            if (err.message) {
                console.log('Consulo cannot debug this tab because: ' + err.message);
            }
        } else {
            if (Consulo.debuggedTab !== null && Consulo.debuggedTab !== tabId) {
                Consulo.hidePageIcon(Consulo.debuggedTab);
            }
            Consulo.debuggedTab = tabId;
            chrome.tabs.get(tabId, function(tab) {
                Consulo.windowWithDebuggedTab = tab.windowId;
                Consulo.createContextMenu(tabId, tab.url);
            });
            // detect viewport
            Consulo.detectViewPort();
            // enable debugger agent before any commands can be sent
            chrome.debugger.sendCommand({tabId: tabId}, 'Debugger.enable', {}, function() {
                if (chrome.runtime.lastError) {
                    console.log('Failed to enable Debugger agent: ' + chrome.runtime.lastError.message);
                }
                // notify IDE that debugger is ready
                Consulo.sendMessage({
                    message: 'debugger_attached',
                    tabId: tabId
                });
            });
        }
    });
};

Consulo.browserDetachDebugger = function(tabId) {
    if (Consulo.DEBUG) {
        console.log('debugger detaching from tab ' + tabId);
    }
    chrome.debugger.detach({tabId : tabId});
    chrome.contextMenus.removeAll();
    if (Consulo.debuggedTab === tabId) {
        Consulo.hidePageIcon(tabId);
        Consulo.debuggedTab = null;
        Consulo.windowWithDebuggedTab = null;
    }
};

// MV3: use chrome.action instead of chrome.pageAction
Consulo.showPageIcon = function(tabId) {
    chrome.action.setIcon({tabId: tabId, path: '/img/icon16.png'});
};
Consulo.hidePageIcon = function(tabId) {
// Do not hide page icon. The tab is managed still and the page icon
// can be used to reconnect to IDE.
};

// MV3: context menu onclick must use chrome.contextMenus.onClicked listener
Consulo.createContextMenu = function(tabId, url) {
    if (Consulo.debuggedTab !== tabId) {
        return;
    }
    var baseUrl = function(url) {
        var index = url.indexOf('#');
        if (index !== -1) {
            url = url.substr(0, index);
        }
        return url;
    };
    Consulo.contextMenuUrl = baseUrl(url);
    if (Consulo.contextMenuCreationInProgress) {
        return;
    } else {
        Consulo.contextMenuCreationInProgress = true;
    }
    chrome.contextMenus.removeAll(function() {
        chrome.contextMenus.create({
            id: 'selectionMode',
            title: Consulo.contextMenuName(),
            contexts: ['all'],
            documentUrlPatterns: [Consulo.contextMenuUrl]
        },
        function() {
            Consulo.contextMenuCreationInProgress = false;
        });
    });
};

// MV3: use onClicked listener instead of onclick in create()
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === 'selectionMode') {
        Consulo.setSelectionMode(!Consulo.getSelectionMode());
    }
});

// Updates the Select Mode context menu
Consulo.updateContextMenu = function() {
    chrome.contextMenus.update('selectionMode', {
        title: Consulo.contextMenuName()
    });
};

// Returns the name of 'Select Mode' context menu
Consulo.contextMenuName = function() {
    return chrome.i18n.getMessage(Consulo.getSelectionMode() ? '_StopSelectMode' : '_StartSelectMode');
};

// show infobar - NOTE: chrome.experimental.infobars is removed in MV3
Consulo.showInfoBar = function(tabId) {
    // chrome.experimental.infobars is no longer available in MV3
    console.log('Infobar not supported in Manifest V3');
};

Consulo.getWindowInfo = function(callback) {
    chrome.windows.getLastFocused({ populate: true }, callback);
};
Consulo.detectViewPort = function(callback) {
    if (Consulo.debuggedTab === null) {
        console.log('No debuggedTab so bypassing the detection');
        if (callback) {
            callback();
        }
        return;
    }
    var script = 'Consulo_ViewPort = {'
            + '    width: window.innerWidth,'
            + '    height: window.innerHeight,'
            + '    marginWidth: window.outerWidth - window.innerWidth,'
            + '    marginHeight: window.outerHeight - window.innerHeight,'
            + '    isMac: navigator.platform.toUpperCase().indexOf("MAC") !== -1'
            + '};';
    chrome.debugger.sendCommand(
        {tabId : Consulo.debuggedTab},
        'Runtime.evaluate',
        {expression: script, returnByValue: true},
        function(result) {
            var viewport = result.result.value;
            Consulo_ViewPort.width = viewport.width;
            Consulo_ViewPort.height = viewport.height;
            Consulo_ViewPort.marginWidth = viewport.marginWidth;
            Consulo_ViewPort.marginHeight = viewport.marginHeight;
            Consulo_ViewPort.isMac = viewport.isMac;
            if (callback) {
                callback();
            }
        }
    );
};
Consulo.resetPageSize = function(callback) {
    chrome.windows.getLastFocused(function(win) {
        var opt = {};
        opt.state = 'maximized';
        chrome.windows.update(win.id, opt);
        if (callback) {
            callback();
        }
    });
};
Consulo.resizePage = function(preset, callback) {
    if (preset === null) {
        this.resetPageSize(callback);
        return;
    }
    var data = Consulo_Presets.getPreset(preset);
    if (data === null) {
        console.error('Preset [' + preset + '] not found.');
        return;
    }
    this._resizePage(data['width'], data['height'], callback);
};
Consulo._resizePage = function(width, height, callback) {
    this.detectViewPort(function() {
        width = parseInt(width);
        height = parseInt(height);
        var opt = {};
        opt.state = 'normal';
        opt.width = width + Consulo_ViewPort.marginWidth;
        opt.height = height + Consulo_ViewPort.marginHeight;
        chrome.windows.getLastFocused(function(win) {
            chrome.windows.update(win.id, opt);
            if (callback) {
                callback();
            }
            if (Consulo_ViewPort.isMac && width < 400) {
                Consulo.openWarning('windowTooSmall', 230);
            }
        });
    });
};
Consulo.showPresetCustomizer = function() {
    chrome.tabs.create({'url': 'html/options.html'});
};

Consulo.browserSendCommand = function(tabId, id, method, params, callback) {
    if (Consulo.DEBUG) {
        console.log('send ['+tabId+","+id+","+method+","+JSON.stringify(params));
    }
    chrome.debugger.sendCommand({tabId : tabId}, method, params,
        function(result) {
            if (chrome.runtime.lastError) {
                var error = JSON.stringify(chrome.runtime.lastError);
                console.log('debugger send command result code: ' + error);
                Consulo.sendDebuggingResponse(tabId, {id : id, error : error});
            } else {
                console.log('debugger send command response: ' + result);
                Consulo.sendDebuggingResponse(tabId, {id : id, result : result});
            }
        });
};

// "fired" when presets changed
Consulo_Presets.presetsChanged = function() {
    // In MV3, no direct access to views - infobars not supported anyway
    console.log('Presets changed');
};

// Updates the context menu and the info-bar according to changes of page-inspection properties
Consulo.addPageInspectionPropertyListener(function(event) {
    var name = event.name;
    if (name !== 'selectionMode') {
        return;
    }
    Consulo.updateContextMenu();
});

/**
 * Open page with warning about unexpected/incorrect debugger detach.
 */
Consulo._checkUnexpectedDetach = function(tabId, reason) {
    if (reason === 'replaced_with_devtools') {
        return;
    }
    var debuggedTab = Consulo.debuggedTab;
    if (debuggedTab != tabId) {
        return;
    }
    setTimeout(function() {
        chrome.tabs.get(debuggedTab, function(tab) {
            if (tab !== undefined) {
                Consulo.openWarning('disconnectedDebugger', 390);
            }
        });
    }, 100);
};

Consulo.openWarning = function(ident, height) {
    Consulo_Warnings.runIfEnabled(ident, function() {
        Consulo.detectViewPort(function() {
            var windowTitleHeight = Consulo_ViewPort.marginHeight - 60;
            Consulo.openPopup('html/warning.html#' + ident, 550, height + Math.max(windowTitleHeight, 0));
        });
    });
};

Consulo.openPopup = function(url, width, height) {
    var options = {
        url: url,
        type: 'popup'
    };
    if (width !== undefined) {
        options['width'] = width;
    }
    if (height !== undefined) {
        options['height'] = height;
    }
    chrome.windows.create(options);
};

chrome.debugger.onEvent.addListener(function(source, method, params) {
    Consulo.sendDebuggingResponse(source.tabId, {method : method, params : params});
});

chrome.debugger.onDetach.addListener(function(source, reason) {
    Consulo._checkUnexpectedDetach(source.tabId, reason);
    chrome.contextMenus.removeAll();
    if (source.tabId === Consulo.debuggedTab) {
        Consulo.debuggedTab = null;
        Consulo.windowWithDebuggedTab = null;
    }
    Consulo.sendDebuggerDetached(source.tabId);
});

// Register tab listeners
chrome.tabs.onCreated.addListener(function(tab) {
    Consulo.tabCreated(tab.id);
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    Consulo.tabUpdated(tab);
});
chrome.tabs.onRemoved.addListener(function(tabId) {
    Consulo.tabRemoved(tabId);
});

// onCreated event is not delivered for the first tab
chrome.windows.getAll({populate: true}, function(windows) {
    for (var i=0; i<windows.length; i++) {
        var win = windows[i];
        for (var j=0; j<win.tabs.length; j++) {
            var tab = win.tabs[j];
            Consulo.tabCreated(tab.id);
            var url = tab.url;
            if (url !== undefined && url !== null && url.length !== 0) {
                Consulo.tabUpdated(tab);
            }
        }
    }
});

Consulo.windowFocused = function(windowId) {
// Disabled because of issue 244689
};

chrome.windows.onFocusChanged.addListener(Consulo.windowFocused);

chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
    if (Consulo.debuggedTab === tabId) {
        var windowId = attachInfo.newWindowId;
        Consulo.windowWithDebuggedTab = windowId;
        Consulo.windowFocused(windowId);
    }
});

/**
 * Warnings manager.
 */
var Consulo_Warnings = {};
Consulo_Warnings.runIfEnabled = function(ident, task) {
    var key = Consulo_Warnings._getKeyFor(ident, 'enabled');
    chrome.storage.sync.get(key, function(items) {
        Consulo_Storage._logError('get', key);
        if (items[key] !== undefined && items[key] === 'false') {
            return;
        }
        task();
    });
};
Consulo_Warnings.enable = function(ident, enabled) {
    var key = Consulo_Warnings._getKeyFor(ident, 'enabled');
    if (enabled) {
        Consulo_Warnings._remove(key);
    } else {
        var data = {};
        data[key] = 'false';
        chrome.storage.sync.set(data, function() {
            Consulo_Storage._logError('set', key);
        });
    }
};
Consulo_Warnings.reset = function() {
    chrome.storage.sync.get(function(items) {
        Consulo_Storage._logError('reset', 'none');
        var warningPrefix = Consulo_Warnings._getKeyFor();
        for (var key in items) {
            if (key.indexOf(warningPrefix) === 0) {
                Consulo_Warnings._remove(key);
            }
        }
    });
};
Consulo_Warnings._getKeyFor = function(ident, key) {
    var keyName = 'warning.';
    if (ident !== undefined) {
        keyName += ident;
        if (key !== undefined) {
            keyName += '.' + key;
        }
    }
    return keyName;
};
Consulo_Warnings._remove = function(key) {
    chrome.storage.sync.remove(key, function() {
        Consulo_Storage._logError('remove', key);
    });
};

/**
 * DevTools manager.
 */
var Consulo_DevTools = {};
Consulo_DevTools.PROPAGATE_CHANGES_KEY = 'devtools.changes.propagate';
Consulo_DevTools.areChangesPropagated = function(task) {
    chrome.storage.sync.get(Consulo_DevTools.PROPAGATE_CHANGES_KEY, function(items) {
        Consulo_Storage._logError('get', Consulo_DevTools.PROPAGATE_CHANGES_KEY);
        var enabled = true;
        if (items[Consulo_DevTools.PROPAGATE_CHANGES_KEY] !== undefined) {
            enabled = items[Consulo_DevTools.PROPAGATE_CHANGES_KEY];
        }
        task(enabled);
    });
};
Consulo_DevTools.setChangesPropagated = function(enabled) {
    var data = {};
    data[Consulo_DevTools.PROPAGATE_CHANGES_KEY] = enabled;
    chrome.storage.sync.set(data, function() {
        Consulo_Storage._logError('set', Consulo_DevTools.PROPAGATE_CHANGES_KEY);
    });
};

/**
 * Connect dev tools page.
 */
chrome.runtime.onConnect.addListener(function(devToolsConnection) {
    var devToolsListener = function(message) {
        var event = message.event;
        if (event === 'onResourceContentCommitted') {
            Consulo_DevTools.areChangesPropagated(function(enabled) {
                if (enabled) {
                    // MV3: use chrome.runtime.sendMessage instead of chrome.extension.sendMessage
                    chrome.runtime.sendMessage({
                        event: "onResourceContentCommitted",
                        resource : message.resource,
                        content: message.content
                    });
                }
            });
        } else if (event === 'areChangesPropagated') {
            Consulo_DevTools.areChangesPropagated(function(enabled) {
                devToolsConnection.postMessage({
                    enabled: enabled
                });
            });
        } else if (event === 'setChangesPropagated') {
            Consulo_DevTools.setChangesPropagated(message.enabled);
        }
    };
    devToolsConnection.onMessage.addListener(devToolsListener);
    devToolsConnection.onDisconnect.addListener(function() {
        devToolsConnection.onMessage.removeListener(devToolsListener);
    });
});

/**
 * Storage logging
 */
var Consulo_Storage = {};
Consulo_Storage._logError = function(operation, key) {
    if (chrome.runtime
            && chrome.runtime.lastError) {
        console.error('Local storage error ("' + operation + '" operation for "' + key + '"): ' + chrome.runtime.lastError.message);
    }
};
