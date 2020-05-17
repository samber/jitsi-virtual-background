/********************
 * global + constants
 ********************/
window.depsLoaded = false;

const FPS = 30; // 30 fps == 🔥
const DEBUG = false;

// BodyPix NN settings
const bodyPixOpts = {
  architecture: 'MobileNetV1',
  outputStride: 16,
  multiplier: 0.75,
  quantBytes: 2,
  // outputStride: 8,
  // multiplier: 1,
  // quantBytes: 4
};

const segmentationOpts = {
  internalResolution: 'low',
  segmentationThreshold: 0.80,
  maxDetections: 5,
}

let bodyPixNN = null;
let backgroundImg = null;

/******************
 * deps and loading
 ******************/
const loadVirtualBackgroundDependencies = () => {
  if (!!window.depsLoaded && window.depsLoaded === true)
    return true;

  // ask content_script injector.js to load some scripts
  const event = new Event('loadDeps');
  document.dispatchEvent(event);
  return false;
}

const loadBodyPixNN = () => {
  if (bodyPixNN != null)
    return Promise.resolve();

  return window.bodyPix.load(bodyPixOpts).then((net) => {
    bodyPixNN = net;
    console.log('BodyPix model ready');
  });
};


/*********************
 * Canvas manipulation
 *********************/
const imageToImageData = (image, w, h) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

const imageDataToCanvas = (imageData, w, h) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

const imageToCanvas = (image, w, h) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  return canvas;
}

/*****************************
 * Image processing start here
 *****************************/
const opencvMatrixToCanvas = (mat, canvasCtx) => {
  const imageData = imageDataToCanvas(new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows), mat.cols, mat.rows);
  canvasCtx.drawImage(imageData, 0, 0, mat.cols, mat.rows);
}

const detectBodies = (frame) => {
  const imageData = imageToImageData(frame, frame.width, frame.height);
  return bodyPixNN.segmentPerson(imageData, segmentationOpts)
    .then((segmentation) => {
      if (segmentation.allPoses.length == 0)
        return null;
      return segmentation.data; // this is a mask: each pixel is noted 0 or 1 depending it is body part or not
    });
}

const processVirtualBackground = (camera, canvas, ctx, width, height) => {
  const requestNextFrame = () => {
    // we add a very small delay, in order to calm down the CPU ;)
    setTimeout(() => {
      processVirtualBackground(camera, canvas, ctx, width, height);
    }, 200);
  };

  if (DEBUG == false && (backgroundImg == null || backgroundImg.src == null || backgroundImg.src == '' || backgroundImg.complete == false)) {
    ctx.drawImage(camera, 0, 0, width, height);
    requestNextFrame();
    return;
  }

  const frame = imageToCanvas(camera, width, height);
  detectBodies(frame)
    .then((mask) => {
      // nobody detected
      if (mask == null) {
        if (DEBUG == true) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, width, height)
        } else {
          ctx.drawImage(backgroundImg, 0, 0, width, height);
        }
        return;
      }

      // at least 1 body detected
      const maskMat = new cv.matFromArray(height, width, cv.CV_8UC1, mask);

      if (DEBUG == true) {
        // show black and white mask
        const maskMa32Mono = new cv.Mat();
        const maskMat32RGBA = new cv.Mat();
        cv.threshold(maskMat, maskMa32Mono, 0, 255, cv.THRESH_BINARY);
        cv.cvtColor(maskMa32Mono, maskMat32RGBA, cv.COLOR_GRAY2RGBA);
        opencvMatrixToCanvas(maskMat32RGBA, ctx);
        maskMa32Mono.delete();
        maskMat32RGBA.delete();
      } else {
        // show background + bodies
        const frameMat = cv.imread(frame);
        const destMat = cv.imread(imageToCanvas(backgroundImg, width, height));
        frameMat.copyTo(destMat, maskMat);
        opencvMatrixToCanvas(destMat, ctx);
        frameMat.delete();
        destMat.delete();
      }

      maskMat.delete();
    })
    .finally(() => {
      requestNextFrame();
    });
};

const cloneAndProcessCameraStream = (stream) => {
  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length == 0) {
    console.warn('No video track detected');
    return stream;
  }

  const videoTrack = videoTracks[0];

  const width = videoTrack.getSettings().width;
  const height = videoTrack.getSettings().height;

  // process frames will be streamed into this canvas
  // this canvas will be exported by `captureStream`
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;

  //  original stream is send to a video element
  const video = document.createElement('video');
  video.width = stream.width
  video.height = stream.height
  video.muted = true;
  video.srcObject = stream;
  video.play();

  processVirtualBackground(video, canvas, ctx, width, height);

  const outputStream = canvas.captureStream(FPS);
  outputStream.getAudioTracks = () => stream.getAudioTracks();
  return outputStream;
};






setInterval(() => {
  if (document.querySelectorAll('.toolbox-content .button-group-center').length == 0)
    return;
  if (document.querySelectorAll('#refined-camera-bg-upload').length != 0)
    return;

  addUploadButton();
}, 1000);

function insertBefore(el, parent) {
  parent.appendChild(el);
}

function addUploadButton() {
  // should be moved to a css file ;)
  const styleWrapper = `
    color: #FFF;
    cursor: pointer;
    display: inline-block;
    line-height: 38px;
    margin: 0 8px;
    text-align: center;
  `;
  const styleInput = `
    width: 0.1px;
    height: 0.1px;
    opacity: 0;
    overflow: hidden;
    position: absolute;
    z-index: -1;
  `;
  const styleLabel = `
    background-color: #fff;
    border-radius: 20px;
    border: 1px solid #d1dbe8;
    margin: 0 4px;
    height: 38px;
    color: #5e6d7a;
    padding: 0 15px;
    font-size: 13px;
    cursor: pointer;
    display: block;
  `;
  const cancelIcon = `
  <svg width="16" height="16" viewBox="0 0 365.696 365.696" style="margin-left: 10px; vertical-align: text-bottom;">
    <path d="m243.1875 182.859375 113.132812-113.132813c12.5-12.5 12.5-32.765624 0-45.246093l-15.082031-15.082031c-12.503906-12.503907-32.769531-12.503907-45.25 0l-113.128906 113.128906-113.132813-113.152344c-12.5-12.5-32.765624-12.5-45.246093 0l-15.105469 15.082031c-12.5 12.503907-12.5 32.769531 0 45.25l113.152344 113.152344-113.128906 113.128906c-12.503907 12.503907-12.503907 32.769531 0 45.25l15.082031 15.082031c12.5 12.5 32.765625 12.5 45.246093 0l113.132813-113.132812 113.128906 113.132812c12.503907 12.5 32.769531 12.5 45.25 0l15.082031-15.082031c12.5-12.503906 12.5-32.769531 0-45.25zm0 0"/>
  </svg>
  `;
  const defaultLabelTxt = 'Choose a virtual background';

  const div = document.createElement('div');
  div.id = 'refined-camera-bg-upload';
  div.innerHTML = `
    <input type="file" id="upload-bg" name="upload-bg" style="${styleInput}">
    <label for="upload-bg" for="file" style="${styleLabel}">${defaultLabelTxt}</label>
  `;
  div.style = styleWrapper;
  document.querySelector('.toolbox-content .button-group-center').appendChild(div);

  document.querySelector('#refined-camera-bg-upload input[type=file]').addEventListener('change', function () {
    if (this.files && this.files[0]) {
      const _img = document.createElement('img');
      _img.src = window.URL.createObjectURL(this.files[0]);
      backgroundImg = _img;

      const filename = this.files[0].name;
      document.querySelector('#refined-camera-bg-upload label').innerHTML = filename + cancelIcon;
    }
  });

  document.querySelector('#refined-camera-bg-upload label').addEventListener('click', function (event) {
    if (backgroundImg != null) {
      backgroundImg = null;
      document.querySelector('#refined-camera-bg-upload label').innerHTML = defaultLabelTxt;
      document.querySelector('#refined-camera-bg-upload input[type=file]').value = '';

      // this prevent browsing window from opening
      event.preventDefault();
    }
  });
}