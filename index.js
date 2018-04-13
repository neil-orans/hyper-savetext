'use strict'

const keybinding = 'S';
const {dialog} = require("electron").remote;
const fs = require('fs');

exports.decorateTerm = (Term, { React, notify }) => {
  return class extends React.Component {
    constructor (props, context) {
      super(props, context);
      this._onTerminal = this._onTerminal.bind(this);
      this._addKeyboardShortcutHandler = this._addKeyboardShortcutHandler.bind(this);
      this._saveText = this._saveText.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
      this._onChange = this._onChange.bind(this);

      this.state = {
          searchText: ""
      }
    }

    render () {
      return React.createElement(Term, Object.assign({}, this.props, {
        onTerminal: this._onTerminal
      }));
    }

    _onTerminal (term) {
      console.log('Not reaching here');
      if (this.props.onTerminal) {
        this.props.onTerminal(term);
      }

      this._addKeyboardShortcutHandler(term);
      this._window = term.document_.defaultView;
      this._window.addEventListener('mouseup', this._onMouseUp);
    }

    _onMouseUp () {
      const newText = this._window.getSelection().toString();
      if (!newText && !this.state.searchText) return;
      this.setState({'searchText': newText});
    }

    _onChange (event) {
      this.setState({'searchText': event.target.value});
    }

    _addKeyboardShortcutHandler(term) {
      const activatingKeyShortcutHandler = [
        "keydown",
        function(e) {
          if ((  (window.process.platform === 'darwin' &&  e.metaKey && !e.ctrlKey)
              || (window.process.platform !== 'darwin' && !e.metaKey &&  e.ctrlKey))
              && !e.shiftKey && e.keyCode === keybinding.charCodeAt(0)) {
            console.log('savetext button pressed!');
            this._saveText(term);
          }
        }.bind(this)
      ];

      term.uninstallKeyboard();
      term.keyboard.handlers_ = [...term.keyboard.handlers_, activatingKeyShortcutHandler];
      term.installKeyboard();
    }

    _saveText(term) {
        console.log(term);
        let fileData = "";
        if (this.state.searchText !== "") {
            fileData = this.state.searchText;
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
            if(err) throw err;
        });
    }
  }
};
