# Chrome Extension

## Install from Chrome web store

[Go!]()

## Install from Firefox web store

[Go!]()

## Test Chrome Extension

To test, go to: chrome://extensions, enable Developer mode and load app as an unpacked extension.

Need more information about Chrome Extension? Please visit [Google Chrome Extension Development](http://developer.chrome.com/extensions/devguide.html)

## Contribute

The browser extension is open source and contributions from community (you!) are welcome.

### Build

Requires node <= 10.

```
npm install -g gulp gulp-cli
```

```bash
gulp watch
```

```bash
gulp build
```

```bash
gulp package
```

### Release

Increase version into manifest.json.

```
rm -rf dist package
rm -f camera-virtual-background.zip
gulp clean
gulp build
gulp package
```

Upload to Firefox Addon first, in order to pass check-list.

## License

[BSD license](http://opensource.org/licenses/bsd-license.php)
