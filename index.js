const {app, dialog, globalShortcut} = require('electron')
const fs = require('fs');

let app_;
let globalSelectedText = "";
let exportSelectedTextAsMenuItem;

exports.onApp = app => {
    app_ = app;
}

exports.onWindow = window => {
    // Get a pointer to the 'Export Selected Text As...' submenu item so
    // we can gray it out when no text is selected, and enable it when text is
    // selected. This will only happen once and is triggered by onTerminal
    window.rpc.on('find-export-submenu-item', (obj) => {
        menu = app_.getApplicationMenu();

        // First find the 'Shell' menu
        shellIndex = -1;
        for (menuItem in menu.items) {
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
        for (subMenuItem in shellSubMenu.items) {
            if (shellSubMenu.items[subMenuItem].label == 'Export Selected Text As...') {
                exportSelectedTextAsMenuItem = shellSubMenu.items[subMenuItem]
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
}

function saveAllText() {
    win = app_.getLastFocusedWindow();
    win.rpc.emit('global-store-text', {});
    return;
}

function saveHighlightedText() {
    var savePath = dialog.showSaveDialog({});
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
      this._onGlobalStoreText = this._onGlobalStoreText.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
    }

    render () {
      return React.createElement(Term, Object.assign({}, this.props, {
        onTerminal: this._onTerminal
      }));
    }

    _onTerminal (term) {
      if (this.props.onTerminal) {
        this.props.onTerminal(term);
      }

      this._window = term.document_.defaultView;
      this._window.addEventListener('mouseup', this._onMouseUp);
      window.rpc.on('global-store-text', () => {this._onGlobalStoreText(term);});
      window.rpc.emit('find-export-submenu-item', {});
    }

    _onMouseUp () {
      const newText = this._window.getSelection().toString();
      if (!newText) return;

      window.rpc.emit('text-selected', {
          'selectedText' : newText
      });
    }

    _onGlobalStoreText(term) {
        let fileData = "";
        // Get all lines from scrollback
        for (let i = 0; i < term.scrollbackRows_.length; ++i) {
            fileData += term.scrollbackRows_[i].innerText;
            fileData += "\n";
        }
        // Add current view to scrollback lines to complete terminals text
        fileData += term.document_.body.innerText;

        const {dialog} = require('electron').remote;
        var savePath = dialog.showSaveDialog({});
        if (savePath) {
            fs.writeFile(savePath, fileData, (err) => {
                if (err) throw err;
            });
        }
    }
  }
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
      id: 'hyperterm-savetext',
      accelerator: 'CommandOrControl+Shift+S',
      click: item => {
          saveHighlightedText();
      }
    });

    return newMenuItem;
  });
};
