/* jshint esversion: 6 */

const {app, dialog, globalShortcut} = require('electron');
const fs = require('fs');

let app_;
let globalSelectedText = "";
let exportSelectedTextAsMenuItem;

exports.onApp = app => {
    app_ = app;
};

exports.onWindow = window => {
    // Get a pointer to the 'Export Selected Text As...' submenu item so
    // we can gray it out when no text is selected, and enable it when text is
    // selected. This will only happen once and is triggered by onTerminal
    window.rpc.on('find-export-submenu-item', (obj) => {
        menu = app_.getApplicationMenu();

        // First find the 'Shell' menu
        shellIndex = -1;
        for (var menuItem in menu.items) {
            if (menu.items[menuItem].label == 'Shell') {
                shellIndex = menuItem;
                break;
            }
        }

        if (shellIndex == -1) {
            // Error - Shell menu should always be findable
            return;
        }

        // Once you have the shell, search for the label 'Export Selected Text As...'
        shellSubMenu = menu.items[shellIndex].submenu;
        for (var subMenuItem in shellSubMenu.items) {
            if (shellSubMenu.items[subMenuItem].label == 'Export Selected Text As...') {
                exportSelectedTextAsMenuItem = shellSubMenu.items[subMenuItem];
            }
        }
    });

    // De facto 'mouseup' event for the window (linked through the 'term' react component
    window.rpc.on('text-selected', (obj) => {
      if (obj.selectedText === "") {
          exportSelectedTextAsMenuItem.enabled = false;
          globalSelectedText = "";
      } else {
          exportSelectedTextAsMenuItem.enabled = true;
          globalSelectedText = obj.selectedText;
      }
    });
};

function saveAllText() {
    win = app_.getLastFocusedWindow();
    win.rpc.emit('global-store-text', {});
    return;
}

function saveHighlightedText() {
    let bwin = app_.getLastFocusedWindow();
    let savePath = dialog.showSaveDialog(bwin, {
        'defaultPath' : "Terminal Saved Output.txt"
    });
    if (savePath) {
        fs.writeFile(savePath, globalSelectedText, (err) => {
            if (err) throw err;
        });
    }
    return;
}

exports.decorateTerm = (Term, { React, notify }) => {
  return class extends React.Component {
    constructor (props, context) {
      super(props, context);
      this._onTerminal = this._onTerminal.bind(this);
      this._onDecorated = this._onDecorated.bind(this);
      this._onGlobalStoreText = this._onGlobalStoreText.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
      let appVersion = require('electron').remote.app.getVersion();
      this._majorVersion = appVersion.charAt(0);
    }

    render () {
      return React.createElement(Term, Object.assign({}, this.props, {
        onTerminal: this._onTerminal,
        onDecorated: this._onDecorated
      }));
    }

    _onTerminal (term) {
      if (this.props.onTerminal) {
        this.props.onTerminal(term);
      }

      if (this._majorVersion == "1") {
          this._window = term.document_.defaultView;
          this._window.addEventListener('mouseup', this._onMouseUp);
          window.rpc.on('global-store-text', () => {this._onGlobalStoreText(term);});
          window.rpc.emit('find-export-submenu-item', {});
      }
    }

    _onDecorated (term) {
      if (this.props.onDecorated) {
        this.props.onDecorated(term);
      }

      if (this._majorVersion == "2") {
          this._term = term;
          term.termRef.onmouseup = this._onMouseUp;
          window.rpc.on('global-store-text', () => {this._onGlobalStoreText(term);});
          window.rpc.emit('find-export-submenu-item', {});
      }
    }

    _onMouseUp () {
      let newText = "";
      if (this._majorVersion == "1") {
          newText = this._window.getSelection().toString();
          if (!newText) return;
          window.rpc.emit('text-selected', {
              'selectedText' : newText
          });
      }
      else {  // Version 2
          newText = this._term.term.selectionManager.selectionText;
          window.rpc.emit('text-selected', {
              'selectedText' : newText
          });
      }
    }

    _onGlobalStoreText(term) {
        let fileData = "";
        if (this._majorVersion == "1") {  // hterm (version 1)
            // Get all lines from scrollback
            for (let i = 0; i < term.scrollbackRows_.length; ++i) {
                fileData += term.scrollbackRows_[i].innerText;
                fileData += "\n";
            }
            // Add current view to scrollback lines to complete terminals text
            fileData += term.document_.body.innerText;
        }
        else {  // xterm.js (version 2)
            let terminalText = [];
            let line_num;
            for (line_num = 0; line_num < term.term.buffer.lines.length; line_num++) {
                let char_array;
                let line = "";
                let non_whitespace_found = false;
                for (char_array = term.term.buffer.lines._array[line_num].length - 1; char_array >= 0; char_array--) {
                    let char = term.term.buffer.lines._array[line_num][char_array][1];
                    if ((non_whitespace_found && char == " ") || (non_whitespace_found && char != " ")) {
                        line = char + line;  // first index is actual char
                    }
                    else if (!non_whitespace_found && char == " ") {
                        continue;
                    }
                    else if (!non_whitespace_found && char != " ") {
                        non_whitespace_found = true;
                        line = char + line;  // first index is actual char
                    }
                }

                terminalText.push(line);
            }

            let terminalBody = "";
            let non_blank_line_found = false;
            for (line_num = terminalText.length - 1; line_num >= 0; line_num--) {
                if (!non_blank_line_found && terminalText[line_num] == "") {
                    terminalText.pop();
                }
                else {
                    non_blank_line_found = true;
                    terminalBody = terminalText[line_num] + "\n" + terminalBody;
                }
            }

            fileData = terminalBody;
        }

        const {dialog} = require('electron').remote;
        let bwin = require('electron').remote.app.getLastFocusedWindow();
        let savePath = dialog.showSaveDialog(bwin, {
            'defaultPath' : "Terminal Saved Output.txt"
        });

        if (savePath) {
            fs.writeFile(savePath, fileData, (err) => {
                if (err) throw err;
            });
        }
    }
  };
};

exports.decorateMenu = menu => {
  return menu.map(menuItem => {
    if (menuItem.label !== 'Shell') {
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
