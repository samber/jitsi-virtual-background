const crossPlatformBrowser = window.browser || window.msBrowser || window.chrome || browser || msBrowser || chrome;

function loadJS(path) {
  return new Promise((resolve, reject) => {
    var s = document.createElement('script');
    s.src = crossPlatformBrowser.runtime.getURL(path);
    s.onload = function (data) {
      this.remove();
      resolve();
    };
    s.onerror = function (data) {
      this.remove();
      reject();
    };
    (document.head || document.documentElement).appendChild(s);
  });
}

function executeJS(rawCode) {
  var s = document.createElement('script');
  s.textContent = rawCode;
  s.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}

loadJS('scripts/bg-processing.js');
loadJS('scripts/camera-hook.js');

let depsLoaded = false;
document.addEventListener('loadDeps', (event) => {
  if (depsLoaded == false) {
    loadJS('lib/tfjs-1.2.min.js')
      .then(() => loadJS('lib/body-pix-2.0.min.js'))
      .then(() => loadJS('lib/opencv.min.js'))
      .then(() => {
        executeJS('window.depsLoaded = true;');
        depsLoaded = true;
      });
  }
});