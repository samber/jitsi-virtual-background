const hookNativeFunc = (funcName, func, tHis, callback) => {
  // console.log('Adding hook to ' + funcName);
  tHis[funcName] = (...args) => {
    console.log(`${funcName}(${args}) hooked!`);
    return callback(func.call(tHis, ...args));
  };
};

const hookNativeFuncFuture = (funcName, func, tHis, cbSuccess, cbFailure) => {
  // console.log('Adding hook to ' + funcName);
  tHis[funcName] = (...args) => {
    console.log(`${funcName}(${args}) hooked!`);
    return new Promise((resolve, reject) => {
      return func.call(tHis, ...args)
        .then((...args) => cbSuccess(...args, resolve))
        .catch((...args) => cbFailure(...args, reject));
    });
  };
};

const hookDeprectatedGetUserMedia = (funcName, func, tHis, cbSuccess, cbFailure) => {
  // console.log('Adding hook to ' + funcName);
  tHis[funcName] = (constraints, successCallback, errorCallback) => {
    console.log(`${funcName}(constraints, cbSuccess, cbError) hooked!`);
    return func.call(
      navigator,
      constraints,
      (...args) => cbSuccess(...args, successCallback),
      (...args) => cbFailure(...args, errorCallback),
    );
  };
};

// window.depsLoaded = false;
const cameraHookSuccess = (stream, callback) => {
  if (loadVirtualBackgroundDependencies() == true)
    return loadBodyPixNN().then(() => callback(cloneAndProcessCameraStream(stream)));

  setTimeout(() => cameraHookSuccess(stream, callback), 500);
};

const cameraHookFailure = (err, callback) => {
  return callback(err);
};

// cross browser compatiblity
if (!!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia)
  hookNativeFuncFuture('getUserMedia', navigator.mediaDevices.getUserMedia, navigator.mediaDevices, cameraHookSuccess, cameraHookFailure);
if (!!navigator.webkitGetUserMedia)
  hookDeprectatedGetUserMedia('webkitGetUserMedia', navigator.webkitGetUserMedia, navigator, cameraHookSuccess, cameraHookFailure);
if (!!navigator.mozGetUserMedia)
  hookDeprectatedGetUserMedia('mozGetUserMedia', navigator.mozGetUserMedia, navigator, cameraHookSuccess, cameraHookFailure);
if (!!navigator.msGetUserMedia)
  hookDeprectatedGetUserMedia('msGetUserMedia', navigator.msGetUserMedia, navigator, cameraHookSuccess, cameraHookFailure);