# hyperterm-savetext

[![Build Status](https://travis-ci.org/neil-orans/hyperterm-savetext.svg?branch=master)](https://travis-ci.org/neil-orans/hyperterm-savetext) [![npm version](https://badge.fury.io/js/hyperterm-savetext.svg)](https://badge.fury.io/js/hyperterm-savetext)

**hyperterm-savetext is a text export plugin for [Hyper](https://hyper.is/)**. It enables you to save/export text within the terminal to a text file. The feel and functionality of the plugin has been modeled after the same feature within macOS's Terminal.app. Currently, Hyper has been tested on macOS with the stable version of Hyper 1.4.8, and the canary version Hyper 2.0.0-canary.16.

<img src="./screenshots/screenshot1.jpg" width="400px" />

<img src="./screenshots/screenshot2.png" width="700px" />

## Install

* **NOTE:** hyperterm-savetext has not yet been tested with Windows or Linux.

#### Using [hpm](https://github.com/zeit/hpm)

```
hpm install hyperterm-savetext
```

#### Manually

To install, edit `~/.hyper.js` and add `"hyperterm-savetext"` to `plugins`:

```
plugins: [
  "hyperterm-savetext",
  // other plugins...
],
```

## Using the plugin

You have the option to save all the text in the terminal or just the selection. The save button is under Hyper's 'Shell' menu, as shown in the first screenshot above. Saving can also be done through the keybindings Cmd-S (Ctrl for Windows/Linux) or Cmd-Shift-S, which corresponds to saving all the terminal text or just the current selection, respectively.

## Contributing

Feel free to contribute to HyperLine by [requesting a feature](https://github.com/neil-orans/hyperterm-savetext/issues/new), [submitting a bug](https://github.com/neil-orans/hyperterm-savetext/issues/new) or contributing code.

To set up the project for development:

1.  Clone the repo to `~/.hyper_plugins/local/hyperterm-savetext`
2.  Add this to your `.hyper.js`:

```js
  localPlugins: [
    // local plugins...
    'hyperterm-savetext'
  ],
```

3.  Reload terminal window

## Authors

* Neil Orans [@neil-orans](https://github.com/neil-orans)
* Nick Morrison [@NicholasMorrison](https://github.com/nicholasmorrison)

## Theme

* [hyper-chesterish](https://github.com/henrikdahl/hyper-chesterish)

## License

[MIT](LICENSE.md)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
