'use strict'

const keybinding = 'J';

exports.decorateTerm = (Term, { React, notify }) => {
  return class extends React.Component {
    constructor (props, context) {
      super(props, context);

      this._onTerminal = this._onTerminal.bind(this);
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

      this._rootDiv = term.div_;

      this._addKeyboardShortcutHandler(term);
    }

    _addKeyboardShortcutHandler(term) {
      const activatingKeyShortcutHandler = [
        "keydown",
        function(e) {
          if ((  (window.process.platform === 'darwin' &&  e.metaKey && !e.ctrlKey)
              || (window.process.platform !== 'darwin' && !e.metaKey &&  e.ctrlKey))
              && !e.shiftKey && e.keyCode === keybinding.charCodeAt(0)) {
            console.log('savetext button pressed!');
            // this._testFunc();
          }
        }.bind(this)
      ];

      term.uninstallKeyboard();
      term.keyboard.handlers_ = [...term.keyboard.handlers_, activatingKeyShortcutHandler];
      term.installKeyboard();
    }

  // This doesn't work...
  //   _testFunc() {
  //       var classnum = prompt("Please enter your class number", "EECS 481");
  //
  //       if (classnum == null || classnum == "") {
  //           txt = "User cancelled the prompt.";
  //       } else {
  //           txt = "You are in " + classnum;
  //       }
  //       alert(txt);
  //   }
  }
};