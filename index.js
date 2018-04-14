const keybinding = 'S';
const {app, dialog, globalShortcut} = require('electron')
const fs = require('fs');

let globalSelectedText = "";
let app_;

exports.decorateTerm = (Term, { React, notify }) => {
  return class extends React.Component {
    constructor (props, context) {
      super(props, context);
      this._onTerminal = this._onTerminal.bind(this);
      this._saveText = this._saveText.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
      this._onChange = this._onChange.bind(this);
      this.state = {
          highlightedText: ""
      }
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

      console.log(app_);
      console.log("me second")
      this._window = term.document_.defaultView;
      this._window.addEventListener('mouseup', this._onMouseUp);
    }

    _onMouseUp () {
      const newText = this._window.getSelection().toString();
      if (!newText && !this.state.highlightedText) return;
      this.setState({'highlightedText': newText});
      globalSelectedText = newText;
      if(newText === "") {

      }
    }

    _onChange (event) {
      this.setState({'highlightedText': event.target.value});
    }

    _saveText(term) {
        let fileData = "";
        if (this.state.highlightedText !== "") {
            fileData = this.state.highlightedText;
        }
        else {
            for (let i = 0; i < term.scrollbackRows_.length; ++i) {
                fileData += term.scrollbackRows_[i].innerText;
                fileData += "\n";
            }
            fileData += term.document_.body.innerText;
        }
        var savePath = dialog.showSaveDialog({});
        fs.writeFile(savePath, fileData, (err) => {
            if (err) throw err;
        });
    }
  }
};

exports.onApp = app => {
  app_ = app;
  console.log("me first")
};

function saveAllText() {
  // console.log(app_);
  // console.log('toggle1!!');
  // console.log(window_.win);
}

function saveHighlightedText() {
  // console.log('toggle2!!');
  // console.log(window_);
}

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
      enabled: globalSelectedText === "" ? 'disabled' : 'enabled',
      accelerator: 'CommandOrControl+Shift+S',
      click: item => {
          saveHighlightedText(item.checked);
      }
    });

    return newMenuItem;
  });
};
