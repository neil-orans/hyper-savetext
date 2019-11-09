/* jshint esversion: 6 */

const { app, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const MENU_LABEL = process.platform === 'darwin' ? 'Shell' : 'File';
const newLineChar = process.platform === 'win32' ? '\r\n' : '\n';

let app_;
let globalSelectedText = '';
let exportSelectedTextAsMenuItem;

exports.onApp = app => {
  app_ = app;
};

exports.onWindow = window => {
  // Get a pointer to the 'Export Selected Text As...' submenu item so
  // we can gray it out when no text is selected, and enable it when text is
  // selected. This will only happen once and is triggered by onTerminal/Decor.
  window.rpc.on('find-export-submenu-item', obj => {
    menu = app_.getApplicationMenu();

    // First find the menu label
    menuLabelIndex = -1;
    for (var menuItem in menu.items) {
      if (menu.items[menuItem].label == MENU_LABEL) {
        menuLabelIndex = menuItem;
        break;
      }
    }

    if (menuLabelIndex == -1) {
      // Error - menu label should always be findable
      return;
    }

    // Once you have the shell, search for the label 'Export Selected Text As...'
    shellSubMenu = menu.items[menuLabelIndex].submenu;
    for (var subMenuItem in shellSubMenu.items) {
      if (shellSubMenu.items[subMenuItem].label == 'Export Selected Text As...') {
        exportSelectedTextAsMenuItem = shellSubMenu.items[subMenuItem];
      }
    }
  });

  // Event for when something has been selected
  window.rpc.on('text-selected', obj => {
    if (!exportSelectedTextAsMenuItem) {
      // Lost the reference to the menu item which occasionally happens
      // during a hot reload
      return;
    }

    // This is what grays out the menu item when nothing is selected
    if (obj.selectedText === '') {
      exportSelectedTextAsMenuItem.enabled = false;
      globalSelectedText = '';
    } else {
      exportSelectedTextAsMenuItem.enabled = true;
      globalSelectedText = obj.selectedText;
    }
  });
};

let saveAllText = () => {
  win = app_.getLastFocusedWindow();
  // If no window is open, win will be null
  if (win) {
    win.rpc.emit('global-store-text', {});
  }
  return;
};

let saveHighlightedText = () => {
  // Get BrowserWindow object to pass into Electron's saveDialog
  let bwin = app_.getLastFocusedWindow();
  let savePath = dialog.showSaveDialog(bwin, {
    defaultPath: 'Terminal Saved Output.txt'
  });
  if (savePath) {
    fs.writeFile(savePath, globalSelectedText, err => {
      if (err) throw err;
    });
  }
  return;
};

exports.decorateTerm = (Term, { React, notify }) => {
  return class extends React.Component {
    constructor(props, context) {
      super(props, context);
      this._onTerminal = this._onTerminal.bind(this);
      this._onDecorated = this._onDecorated.bind(this);
      this._onGlobalStoreText = this._onGlobalStoreText.bind(this);
      this._textSelected = this._textSelected.bind(this);
      let appVersion = require('electron').remote.app.getVersion();
      this._majorVersion = appVersion.charAt(0);
      this._eventTriggersSet = false;
    }

    render() {
      return React.createElement(
        Term,
        Object.assign({}, this.props, {
          onTerminal: this._onTerminal,
          onDecorated: this._onDecorated
        })
      );
    }

    _onTerminal(term) {
      if (this.props.onTerminal) {
        this.props.onTerminal(term);
      }

      this._window = term.document_.defaultView;
      this._window.addEventListener('mouseup', this._textSelected);
      window.rpc.on('global-store-text', () => {
        this._onGlobalStoreText(term);
      });
      window.rpc.emit('find-export-submenu-item', {});
    }

    _onDecorated(term) {
      if (this.props.onDecorated) {
        this.props.onDecorated(term);
      }

      // Version 1 will set the event listener in onTerminal so only do the
      // following code for Version 2+ of Hyper
      if (this._majorVersion > '1' && !this._eventTriggersSet) {
        this._term = term;
        this._term.termRef.onmouseup = this._textSelected;
        let eventObj = this._term.term._core._events;
        if ('selection' in eventObj) {
          let selectionObj = eventObj.selection;
          let function_already_stored = false;
          for (var i in selectionObj) {
            let funcName = selectionObj[i].name;
            if (funcName == 'bound _textSelected') {
              function_already_stored = true;
              break;
            }
          }

          if (!function_already_stored) {
            this._term.term.on('selection', this._textSelected);
          }
        } else {
          this._term.term.on('selection', this._textSelected);
        }

        if (!('global-store-text' in window.rpc.emitter._events)) {
          window.rpc.on('global-store-text', () => {
            this._onGlobalStoreText(term);
          });
        }

        if (typeof exportSelectedTextAsMenuItem === 'undefined') {
          window.rpc.emit('find-export-submenu-item', {});
        }

        this._eventTriggersSet = true;
      }
    }

    _textSelected() {
      let newText = '';
      // Version 1 / hterm
      if (this._majorVersion == '1') {
        newText = this._window.getSelection().toString();
        window.rpc.emit('text-selected', {
          selectedText: newText
        });
      } else {
        // Version 2+ / xterm.js
        if (this._term == null) {
          return;
        }

        newText = this._term.term._core.selectionManager.selectionText;
        window.rpc.emit('text-selected', {
          selectedText: newText
        });
      }
    }

    _onGlobalStoreText(term) {
      let fileData = '';
      if (this._majorVersion == '1') {
        // Get all lines from scrollback
        for (let i = 0; i < term.scrollbackRows_.length; ++i) {
          fileData += term.scrollbackRows_[i].innerText;
          fileData += newLineChar;
        }

        // Add current view to scrollback lines to complete terminals text
        fileData += term.document_.body.innerText;
      } else {
        let terminalText = [];
        let line_num;
        for (line_num = 0; line_num < term.term._core.buffer.lines.length; line_num++) {
          let char_array;
          let line = '';
          let non_whitespace_found = false;
          for (char_array = term.term._core.buffer.lines._array[line_num].length*3-2; char_array >= 0; char_array -= 3) {
            let char_code = term.term._core.buffer.lines._array[line_num]._data[char_array];
            if (char_code == 0){
                continue;
            }
            let char = String.fromCharCode(char_code);
            if (non_whitespace_found) {
              line = char + line; // first index is actual char
            } else if (!non_whitespace_found && char == ' ') {
              continue;
            } else if (!non_whitespace_found && char != ' ') {
              non_whitespace_found = true;
              line = char + line; // first index is actual char
            }
          }

          terminalText.push(line);
        }

        // Remove blank lines at the end of the terminal output
        for (line_num = terminalText.length - 1; line_num >= 0; line_num--) {
          if (terminalText[line_num] == '') {
            terminalText.pop();
          } else {
            break;
          }
        }

        fileData = terminalText.join(newLineChar);
      }

      const { dialog } = require('electron').remote;
      let bwin = require('electron').remote.app.getLastFocusedWindow();
      let savePath = dialog.showSaveDialog(bwin, {
        defaultPath: 'Terminal Saved Output.txt'
      });

      if (savePath) {
        fs.writeFile(savePath, fileData, err => {
          if (err) throw err;
        });
      }
    }
  };
};

exports.decorateMenu = menu => {
  return menu.map(menuItem => {
    if (menuItem.label !== MENU_LABEL) {
      return menuItem;
    }

    const newMenuItem = Object.assign({}, menuItem);
    newMenuItem.submenu = [...newMenuItem.submenu];

    newMenuItem.submenu.push({
      type: 'separator'
    });

    newMenuItem.submenu.push({
      label: 'Export Text As...',
      type: 'normal',
      accelerator: 'CommandOrControl+S',
      click: item => {
        saveAllText();
      }
    });

    newMenuItem.submenu.push({
      label: 'Export Selected Text As...',
      type: 'normal',
      enabled: false,
      accelerator: 'CommandOrControl+Shift+S',
      click: item => {
        saveHighlightedText();
      }
    });

    return newMenuItem;
  });
};
