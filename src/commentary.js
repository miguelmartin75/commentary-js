"use strict";

const ENABLE_REPLAY = false;
const ENABLE_AUTOPLAY = true;

const NONE_STR = "_none"
const MODE_ANNOTATE = 0
const MODE_REPLAY = 1
const MAIN_SCREEN = 1
const SETTINGS_SCREEN = 2
const SHORTCUTS_SCREEN = 3
const START_SCREEN = SETTINGS_SCREEN

const BASE_LINE_WIDTH_PER_1K_PX = 8;
const MIN_LINE_WIDTH = 3;

const RECORDING_EXT = "webm"
const RECORDING_BORDER_CLASSES = "border-red-700";
const VIDEO_RECORDING_TYPE = `video/${RECORDING_EXT}; codec="h264,aac"`
const AUDIO_RECORDING_TYPE = `audio/${RECORDING_EXT}; codec=aac`
const TIME_BUTTON_CLASSES = "m-1 px-4 py-1 text-sm text-white-600 font-semibold rounded-full border border-white-600 hover:text-black hover:bg-black-600 hover:border-black-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 bg-gray-100"
const DELETE_BUTTON_CLASSES = "m-1 px-4 py-1 text-sm text-white-600 font-semibold rounded-full border border-white-600 hover:text-black hover:bg-black-600 hover:border-black-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 bg-gray-100"
const REPLAY_ANN_BUTTON_CLASSES = "m-1 px-4 py-1 text-sm text-white-600 font-semibold rounded-full border border-white-600 hover:text-black hover:bg-black-600 hover:border-black-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 bg-gray-100"
const INVALID_TEXT_CLASS = "border-red-500"
const VALID_TEXT_CLASS = "border-green-500"
const ENABLE_BUTTON_CLASSES = "bg-blue-500 hover:bg-blue-700"
const DISABLE_BUTTON_CLASSES = "bg-gray-500 hover:none"
const FPS = 30; // TODO: use mp4jsbox to get frame rate?

const deepCopy = (x) => {
  // NOTE(miguelmartin): is there a better way to deep copy?
  return JSON.parse(JSON.stringify(x))
}

const timeNow = () => {
  return performance.now()
}

const addStyle = (el, styleClasses) => {
    for(const clazz of styleClasses.split(" ")) {
      el.classList.add(clazz)
    }
}

const removeStyle = (el, styleClasses) => {
    for(const clazz of styleClasses.split(" ")) {
      el.classList.remove(clazz)
    }
}

const createOption = (label, value, isSelected, parentNode) => {
  const node = document.createElement("option")
  node.innerHTML = label
  node.selected = isSelected;
  node.value = value
  if(parentNode) parentNode.appendChild(node);
  return node;
};

const disableFocusForSlider = (el) => {
    el.addEventListener("keydown", (e) => {
      e.preventDefault()
    })
    el.addEventListener("keyup", (e) => {
      e.preventDefault()
    })
};

const disableFocusForClickable = (el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault()
    });
    el.addEventListener("keydown", (e) => {
      e.preventDefault()
    });
    el.addEventListener("keyup", (e) => {
      e.preventDefault()
    });
};

const clamp = (val, min, max) => {
  return Math.min(Math.max(val, min), max)
}

// ref: https://web.dev/patterns/files/save-a-file/#demo
const saveFile = async (blob, suggestedName) => {
  // Feature detection. The API needs to be supported
  // and the app not run in an iframe.
  const supportsFileSystemAccess =
    'showSaveFilePicker' in window &&
    (() => {
      try {
        return window.self === window.top;
      } catch {
        return false;
      }
    })();
  // If the File System Access API is supported…
  if (supportsFileSystemAccess) {
    try {
      // Show the file save dialog.
      const handle = await showSaveFilePicker({
        suggestedName,
      });
      // Write the blob to the file.
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // Fail silently if the user has simply canceled the dialog.
      if (err.name !== 'AbortError') {
        console.error(err.name, err.message);
        return;
      }
    }
  }
  // Fallback if the File System Access API is not supported…
  // Create the blob URL.
  const blobURL = URL.createObjectURL(blob);
  // Create the `<a download>` element and append it invisibly.
  const a = document.createElement('a');
  a.href = blobURL;
  a.download = suggestedName;
  a.style.display = 'none';
  document.body.append(a);
  // Click the element.
  a.click();
  // Revoke the blob URL and remove the element.
  setTimeout(() => {
    URL.revokeObjectURL(blobURL);
    a.remove();
  }, 1000);
};

const hide = (el) => {
  el.classList.add("hidden")
};

const show = (el) => {
  el.classList.remove("hidden")
};


class Recorder {
  getExt() {
    if(this.videoEnabled) {
      return "mp4"
    } else {
      return "mp3"
    }
  }

  constructor() {
    this.currentBlobs = []
    this.recordingsById = {}
    this.currentId = 0
  }

  hasRecordings() {
    return Object.keys(this.recordingsById).length > 0
  }

  addRecording(url, blob, callCb, obj, ann) {
    const curr = {url: url, blob: blob, id: this.currentId}
    if(obj || ann) {
      curr.data = ann
      obj.id = curr.id
    }
    this.recordingsById[this.currentId] = curr
    this.currentBlobs = []
    this.currentId += 1

    
    if(callCb) {
      this.newRecordingCb(curr)
    }
  }

  setup(stream, newRecordingCb, hasVideo) {
    if(!stream) {
      return "no stream given"
    }
    const recordingType = hasVideo ? VIDEO_RECORDING_TYPE : AUDIO_RECORDING_TYPE;
    this.videoEnabled = hasVideo

    if (!MediaRecorder.isTypeSupported(recordingType)) { // <2>
      console.warn(`${recordingType} is not supported`)
    }
    this.mediaRecorder = new MediaRecorder(stream, { // <3>
      mimeType: recordingType
    })

    this.newRecordingCb = newRecordingCb 
    this.mediaRecorder.addEventListener('stop', () => {
      const blob = new Blob(this.currentBlobs, { type: recordingType })
      const url = URL.createObjectURL(blob)
      this.addRecording(url, blob, true)
    })

    this.mediaRecorder.addEventListener('dataavailable', event => {
      this.currentBlobs.push(event.data)
    })
    return null;
  }

  clearRecordings() {
    this.recordingsById = {}
  }

  remove(id) {
    delete this.recordingsById[id]
  }

  start() {
    // TODO: catch errors
    if(this.mediaRecorder) {
      this.mediaRecorder.start()
    }
  }

  stop() {
    if(this.mediaRecorder) {
      this.mediaRecorder.stop()
    }
  }
}

function isPlaying(el) {
  // https://stackoverflow.com/a/6877530
  return !!(el.currentTime > 0 && !el.paused && !el.ended && el.readyState > 2);
}

class Video {
  constructor(video, url, on_play_fail, seek_to, on_ready) {
    // TODO: investigate performance using "timeupdate"
    this.playing = false;
    this.timeupdate = false;
    this.ready = false;
    this.url = url;
    this.seek_to = seek_to;
    this.on_play_fail = on_play_fail
    this.on_ready = on_ready

    this.video = video;
    this.video.playsInline = true;
    this.video.muted = false;
    this.video.loop = false;
    this.video.src = url;

    // https://developer.chrome.com/blog/play-request-was-interrupted/
    // plays video to run init
    video.play().then(() => {
      this.ready = true;
      this.pause();
      if(this.seek_to) {
        this.video.currentTime = this.seek_to;
      } else {
        this.video.currentTime = 0;
      }
      this.on_ready(this)
    }).catch(err => {
      console.error(err)
    });

    this.seekCbs = []

    video.addEventListener("canplay", () => {
      for(const x of this.seekCbs) {
        if(x.t === this.video.currentTime) {
          x.cb()
        }
      }
      this.seekCbs = []
    })
  }

  seek(t, onReady) {
    this.video.currentTime = t
    if(onReady) {
      this.seekCbs.push({t: t, cb: onReady})
    }
  }

  play() {
    if(!this.ready) {
      console.debug("Video.play: video not ready")
      return;
    }
    this.video.play().catch(err => {
      this.on_play_fail({"error": err, "action": "play"})
    });
  }

  pause() {
    if(!this.ready) {
      console.debug("Video.pause: video not ready")
      return;
    }
    this.video.pause()
  }

  isPlaying() {
    return isPlaying(this.video)
  }

  isReady() {
    return this.ready;
  }
}

function resizeCanvas(canvas, ctx) {
  let multiplier = 1
  multiplier = multiplier || 1;
  const width  = canvas.clientWidth  * multiplier | 0;
  const height = canvas.clientHeight * multiplier | 0;
  const fontSize = Math.round(canvas.clientHeight / 20)
  // const fontSize = 48
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width  = width;
    canvas.height = height;
    // TODO configure style
    ctx.lineCap = 'round';
    ctx.font = `${fontSize}px serif`;
    ctx.strokeStyle = '#c0392b';
    return true;
  }
  return false;
}

class DrawCtx {
  constructor() {
    this.paths = []
    this.videos = []
    this.canvas = null;
    this.enableVideo = false;
  }

  onResize() {
    resizeCanvas(this.canvas, this.gl);
  }

  setup(canvas) {
    this.canvas = canvas;

    // NOTE(miguelmartin): we're not actually using webgl, it's a canvas ;)
    const gl = canvas.getContext("2d");
    if (gl === null) {
      return "Unable to initialize canvas. Your browser or machine may not support it.";
    }

    this.gl = gl;
    window.addEventListener("resize", (event) => {
      if(this.videos.length >= 1) {
        this.onResize();
        for(const vid of this.videos) {
          this.updateDrawData(vid)
        }
      }
    });

    // TODO: configure or dynamic
    return null;
  }

  addPath(path) {
    this.paths.push(path)
  }

  clearPaths() {
    this.paths = []
  }

  addCreateVideo(url, on_play_fail, seek_to) {
    const video_id = this.videos.length;
    const video_el = document.createElement("video");
    const video = new Video(
      video_el,
      url,
      on_play_fail,
      seek_to,
      () => {
        this.updateDrawData(ret)
      }
    );

    let ret = {
      container: video,
      drawData: {
        x: 0,
        y: 0,
        w: undefined,
        h: undefined,
      },
      id: video_id,
    };
    this.videos.push(ret);
    return ret
  }

  updateDrawData(video) {
    const cW = this.canvasWidth();
    const cH = this.canvasHeight();

    let vW = video.container.video.videoWidth
    let vH = video.container.video.videoHeight
    const r = Math.min(cW / vW, cH / vH)
    vW *= r
    vH *= r

    let offsetX = 0
    let offsetY = 0
    offsetX = cW / 2 - vW / 2
    offsetY = cH / 2 - vH / 2
    video.drawData = {
      x: offsetX,
      y: offsetY,
      w: vW,
      h: vH,
    }
  }

  removeVideos() {
    this.videos = []
  }

  canvasWidth() {
    return this.canvas.clientWidth;
  }

  canvasHeight() {
    return this.canvas.clientHeight;
  }

  renderFrame(dt) {
    const cW = this.canvasWidth();
    const cH = this.canvasHeight();

    this.gl.clearRect(0, 0, cW, cH);
    if(this.videos.length === 0) {
      const textX = cW / 4;
      const textY = cH / 2;
      const text = "Open Settings to start annotating (press ESC)";
      this.gl.fillText(text, textX, textY);
      return;
    }
    for(const {container, drawData} of this.videos) {
      // TODO: use drawData
      if(container.isReady()) {
        const frame = container.video
        this.gl.drawImage(
          frame,
          drawData.x,
          drawData.y,
          drawData.w,
          drawData.h,
        );
      }
      if(this.paths.length > 0) {
        this.gl.lineWidth = Math.max(
          BASE_LINE_WIDTH_PER_1K_PX * (Math.min(drawData.w, drawData.h) / 1000),
          MIN_LINE_WIDTH,
        )
        for(const path of this.paths) {
          this.gl.beginPath();
          this.gl.moveTo(drawData.x + path.from.x * drawData.w, drawData.y + path.from.y * drawData.h)
          this.gl.lineTo(drawData.x + path.to.x * drawData.w, drawData.y + path.to.y * drawData.h)
          this.gl.stroke(); // draw it!
        }
      }
      // NOTE: assumes len(videos) == 1
      break;
    }
  }
}

class App {
  async createRecorder(videoDevice, micDevice) {
    let err = null 

    if(this.stream) {
      var tracks = this.stream.getTracks();
      for(var i = 0; i < tracks.length; i++){
        tracks[i].stop();
      }
    }
    
    let media = { }
    if(videoDevice !== NONE_STR) {
      media["video"] = {deviceId: videoDevice}
    } else {
      media["video"] = false
    }
    if(micDevice !== NONE_STR) {
      media["audio"] = {deviceId: micDevice}
    } else {
      media["audio"] = false
    }

    this.recordDisabled = true
    this.stream = null
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(media)
      var tracks = this.stream.getTracks();
      for(var i = 0; i < tracks.length; i++){
        if(tracks[i].kind === "audio") {
          this.selectMicDevice(tracks[i].getSettings().deviceId)
        } else {
          this.selectVideoDevice(tracks[i].getSettings().deviceId)
        }
      }
    } catch(e) {
      console.error(e)
    }

    // ref https://stackoverflow.com/a/52952907
    // mic volume bar
    {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(this.stream);
      if(this.scriptProcessor) {
        this.scriptProcessor.onaudioprocess = null;
      }
      this.scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(audioContext.destination);
      this.scriptProcessor.onaudioprocess = () => {
        if(this.activeScreen === SETTINGS_SCREEN) {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          const arraySum = array.reduce((a, value) => a + value, 0);
          const average = arraySum / array.length;
          micVolumeBar.value = Math.round(average)
        }
      };
    }
    err = this.recorder.setup(this.stream, this._recordingCreated, media["video"] !== false)
    if(err) {
      return err
    }
    this.recordDisabled = false
    this.recorder.recordingCreatedCb = (x) => {
      this.endRecording(x)
    }
    this.settingsPreviewVideo.autoplay = true
    this.settingsPreviewVideo.muted = true
    this.settingsPreviewVideo.srcObject = this.stream;
    return err
  }


  async setup(canvas) {
    this.recorder = new Recorder()
    this.canvas = canvas;
    this.draw = new DrawCtx();
    let err = this.draw.setup(canvas);
    if(err) {
      return err;
    }
    this.recordingCreatedCb = null
  }

  _recordingCreated(src) {
    if(this.recordingCreatedCb) {
      this.recordingCreatedCb(src)
    } else {
      console.error("recording created without callback")
    }
  }

  resetDrawCanvas() {
    this.pos = {x: undefined, y: undefined, t: undefined}
    this.draw.clearPaths()
    this.draw.onResize()
  }

  initDrawCanvas() {
    // modified from https://stackoverflow.com/a/30684711
    this.resetDrawCanvas()
    const setDrawPos = (e) => {
      if(this.draw.videos.length == 0) {
        return;
      }
      const vid = this.draw.videos[0]
      if(!vid.drawData.w) {
        return;
      }

      const target = e.target;
      const rect = target.getBoundingClientRect();
      const vidRect = vid.drawData

      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const vidX = relX - vidRect.x
      const vidY = relY - vidRect.y
      this.pos.x = clamp(vidX / vidRect.w, 0, 1);
      this.pos.y = clamp(vidY / vidRect.h, 0, 1);
      this.pos.t = timeNow()
    }
    const clearDrawPos = (e) => {
      this.pos = {x: undefined, y: undefined, t: undefined}
    }
    const addPath = (e) => {
      // mouse left button must be pressed
      if (e.buttons !== 1) return;
      if(!this.isRecording) {
        return;
      }

      const from = {x: this.pos.x, y: this.pos.y, t: this.pos.t}
      setDrawPos(e)
      if(!from.x || !from.y) return;
      const to = {x: this.pos.x, y: this.pos.y, t: this.pos.t}
      const path = {from: from, to: to}
      this.draw.addPath(path)
    }
    this.finishStrokes = () => {
      if(this.draw.paths.length > 0) {
        this.addEvent({type: "path", action: null, paths: deepCopy(this.draw.paths)})
      }
    }

    this.clearStroke = () => {
      this.addEvent({type: "path", action: "clear", paths: deepCopy(this.draw.paths)})
      this.pos = {x: undefined, y: undefined, t: undefined}
      this.draw.clearPaths()
      this.draw.onResize()
    }

    this.canvas.addEventListener("mousemove", addPath);
    this.canvas.addEventListener("mouseup", clearDrawPos);
    this.canvas.addEventListener("mousedown", setDrawPos);
    this.canvas.addEventListener("mouseenter", setDrawPos);
    // TODO: when recording save the time when cleared
    this.clearStrokeBtn.addEventListener("click", this.clearStroke);
  }

  updateTimeline() {
    this.playBar.value = this.viewVideo.container.video.currentTime * 1000
    this.timeInfo.innerHTML = `${this.viewVideo.container.video.currentTime}`
    this.frameInfo.innerHTML = `${Math.floor(this.viewVideo.container.video.currentTime * FPS)}`
  }

  async initSettings() {

    this.userId = document.getElementById("username")
    this.expertiseSelector = document.getElementById("expertise")
    this.videoSelector = document.getElementById("videoSelect")
    this.batchSelector = document.getElementById("batchSelect")
    this.startAnnotatingBtn = document.getElementById("startAnnotatingBtn")
    this.nextVideoBtn = document.getElementById("nextVideoBtn")
    this.prevVideoBtn = document.getElementById("prevVideoBtn")
    this.videoNameLabel = document.getElementById("videoNameLabel")

    this.cameraSelector = document.getElementById("cam")
    this.micSelector = document.getElementById("mic")
    this.settingsPreviewVideo = document.getElementById("settingsPreviewVideo")
    this.videoFileInput = document.getElementById("videoFile")
    this.videoFileInput.addEventListener("change", () => {
      // TODO: support multiple files
      this.openVideo(URL.createObjectURL(this.videoFileInput.files[0]))
    }, false);

    // disable focus
    const allButtons = [this.nextVideoBtn, this.prevVideoBtn, this.startAnnotatingBtn]
    for(const but of allButtons) {
      disableFocusForClickable(but)
    }

    this.metadata = {}
    this.videosByBatch = {}
    this.devById = {}
    this.videoName = null
    this.userIdValid = false
    this.videosToAnnotate = []
    this.videoIdx = 0

    this.checkIfCanOpenNewVideo = () => {
      if(!this.hasSubmitted && this.viewVideo && this.recorder.hasRecordings()) {
        alert("Please Finish before you move onto another video")
        return false;
      }
      return true;
    }
    this.updateVideoNameLabel = () => {
      // TODO
      if(this.videosToAnnotate.length > 0) {
        this.videoNameLabel.innerHTML = `${this.videoName} (${this.videoIdx + 1} / ${this.videosToAnnotate.length})`
      } else {
        this.videoNameLabel.innerHTML = "No Video Open"

      }
    }

    this.openVideoByInfo = (info, onReady, force) => {
      const name = info["name"]
      const task = info["task"]
      if(!this.checkIfCanOpenNewVideo()) {
        return false;
      }

      fetch('/videos/', {
          method: "POST",
          mode: "cors",
          cache: "no-cache",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          redirect: "follow",
          referrerPolicy: "no-referrer",
          body: JSON.stringify({
            "video_name": name,
            "userid": this.userId.value,
          })
        }
      ).then(r => r.json()).then(x => {
        if(!x["path"]) {
          alert(`Could not load video '${this.videoSelector.value}'\nPlease report this the workplace group.`)
          return;
        }
        const batchKey = this.batchSelector.value
        const batchVideos = this.videosByBatch[batchKey]
        if(this.openVideo(x["path"], name, force)) {
          let found = false;
          for(var idx = 0; idx < batchVideos.length; ++idx) {
            if(batchVideos[idx]["name"] == name) {
              found = true;
              this.videoIdx = idx;
              break;
            }
          }
          if(!found) {
            alert(`Could not find name: ${name}. Please report to the workplace group: ${this.userId}`)
            this.videoIdx = -1;
          }
          this.videoSelector.selectedIndex = this.videoIdx + 1;
          this.videoName = name;
          this.taskInfo.innerHTML = task
          this.updateVideoNameLabel()
          this.setScreen(MAIN_SCREEN)
          if(onReady) {
            onReady()
          }
        }
      })
    }

    this.openVideo = (url, name, force) => {
      if(this.viewVideo && name === this.videoName && !force) {
        return false;
      }
      if(!this.checkIfCanOpenNewVideo()) {
        return false;
      }
      this.pause()
      this.unmute()
      this.videoName = name
      this.hasSubmitted = false
      this.recorder.stop()
      this.clearAnnotations()
      this.clearStroke()
      this.draw.removeVideos()

      this.proficiencyWhyText.value = ""
      this.profiencyScoreSelector.value = NONE_STR

      this.viewVideo = this.draw.addCreateVideo(url, () => {
        this.pause()
        this.draw.onResize()
      });
      let ctx = this;
      this.viewVideo.container.video.onloadedmetadata = function() {
        ctx.playBar.max = this.duration * 1000;
      };
      this.updateTimeline()
      return true;
    }

    this.nextVideo = () => {
      // TODO
      let idx = (this.videoIdx + 1) % this.videosToAnnotate.length
      this.openVideoByInfo(this.videosToAnnotate[idx])
    }

    this.prevVideo = () => {
      // TODO
      let idx = (this.videoIdx - 1) % this.videosToAnnotate.length
      this.openVideoByInfo(this.videosToAnnotate[idx])
    }

    this.addVideoDevice = (x, isSelected) => {
      createOption(x.label, x.deviceId, isSelected, this.cameraSelector);
    }

    this.addAudioDevice = (x, isSelected) => {
      createOption(x.label, x.deviceId, isSelected, this.micSelector);
    }

    // setup devices
    this.devices = []
    this.refreshingDevices = false
    this.refreshDevices = async (updateMic, updateVid) => {
      if(updateVid) {
        this.cameraSelector.innerHTML = ""
        createOption("No Device", NONE_STR, false, this.cameraSelector)
      }

      if(updateMic) {
        this.micSelector.innerHTML = ""
        createOption("No Device", NONE_STR, false, this.micSelector)
      }
      try {
        this.devices = await navigator.mediaDevices.enumerateDevices()
        for (var idx in this.devices) {
          const dev = this.devices[idx];
          const isDefault = dev.deviceId === "default";
          const isAudioInp = dev.kind === "audioinput";
          const isVideoInp = dev.kind === "videoinput";
          this.devById[dev.deviceId] = dev;
          if(isAudioInp && updateMic) {
            this.addAudioDevice(dev, isDefault)
          } else if(isVideoInp && updateVid) {
            this.addVideoDevice(dev, isDefault)
          }
        }
      } catch(e) {
        console.error(e)
      }
    }
    navigator.permissions.query({ name: "camera" }).then(res => {
      if(res.state === "granted"){
        this.refreshDevices(false, true)
      } else if (res.state === "prompt") {
        this.camOrMicChanged(true).then(() => {
          this.refreshDevices(false, true)
        })
      }
    });
    navigator.permissions.query({ name: "microphone" }).then(res => {
      if(res.state === "granted"){
        this.refreshDevices(true, false).then(() => {
          this.camOrMicChanged()
        })
      } else if (res.state === "prompt") {
        this.camOrMicChanged().then(() => {
          this.refreshDevices(true, false)
        })
      }
    });

    this.camOrMicChanged = (forceVideo) => {
      let camDevId = this.cameraSelector.value;
      const micDevId = this.micSelector.value;
      if(forceVideo) {
        if(camDevId == NONE_STR) {
          camDevId = null;
        }
      }
      return this.createRecorder(camDevId, micDevId)
    }
    this.cameraSelector.addEventListener("change", () => { this.camOrMicChanged() })
    this.micSelector.addEventListener("change", () => { this.camOrMicChanged() })

    this.selectVideoDevice = (deviceId) => {
      for(const opt of this.cameraSelector.options) {
        opt.selected = opt.value === deviceId
      }
    }
    this.selectMicDevice = (deviceId) => {
      for(const opt of this.micSelector.options) {
        opt.selected = opt.value === deviceId
      }
    }
    this.nextVideoBtn.addEventListener("click", this.nextVideo)
    this.prevVideoBtn.addEventListener("click", this.prevVideo)
    this.startAnnotatingBtn.addEventListener("click", () => {
      if(!this.userIdValid) {
        alert("Please enter your user id")
        return;
      }
      this.userId.disabled = true
      if(this.videoSelector.value === NONE_STR) {
        alert("Please select a video")
        return;
      }
      // TODO
      if(this.videosToAnnotate.length === 0) {
        alert("No videos to annotate. Please report bug to workplace group.")
        return;
      }

      this.openVideoByInfo(this.videosToAnnotate[this.videoSelector.selectedIndex - 1])
    });

    this.updateVideosForExpertise = () => {
      this.videoSelector.innerHTML = "";
      const batchKey = this.batchSelector.value
      let catName = this.metadata["category"]
      let vids = this.videosByBatch[batchKey]

      this.videosToAnnotate = []
      createOption("None", "_none", true, this.videoSelector)
      for(let vid of vids) {
        createOption(vid["name"], vid["name"], false, this.videoSelector)
        this.videosToAnnotate.push(vid)
      }
    }

    this.updateBatch = () => {
      this.updateVideosForExpertise()
    }
    this.batchSelector.addEventListener("change", this.updateBatch)
    this.expertiseSelector.addEventListener("change", this.updateBatch)
    this.checkUser = (onReady) => {
      const value = deepCopy(this.userId.value)
      if(value.length === 0) {
        this.userIdValid = false
        this.userId.classList.remove(VALID_TEXT_CLASS)
        this.userId.classList.add(INVALID_TEXT_CLASS)
        return;
      }
      this.batchSelector.innerHTML = "";

      fetch(`/videos/${value}`).then(r => r.json()).then(x => {
        this.metadata = x
        // console.log(this.metadata)
        this.videosByBatch = {}
        let cat = this.metadata["category"]
        if(!cat) {
          return;
        }
        for(const vid of this.metadata["videos_by_category"][cat]) {
          const b = vid["batch"]
          if(!(b in this.videosByBatch)) {
            this.videosByBatch[b] = []
          }
          this.videosByBatch[b].push(vid)
        }

        if(!x["valid"]) {
          this.userIdValid = false
          this.userId.classList.remove(VALID_TEXT_CLASS)
          this.userId.classList.add(INVALID_TEXT_CLASS)
          this.expertiseSelector.innerHTML = "";
          this.videoSelector.innerHTML = "";
          this.batchSelector.innerHTML = "";
          this.videoName = null
        } else {
          this.userIdValid = true
          this.userId.classList.remove(INVALID_TEXT_CLASS)
          this.userId.classList.add(VALID_TEXT_CLASS)

          // populate the UI
          this.expertiseSelector.innerHTML = "";
          const catName = x["category"]
          createOption(catName, catName, false, this.expertiseSelector)

          let startIdx = 0
          var seenLatest = false
          for(const batch in this.videosByBatch) {
            let label = batch
            const batchData = this.videosByBatch[batch]
            const isOldBatch = batchData[0]["in_annotated_batch"]
            const isNewBatch = batchData[0]["in_annotating_batch"]
            if(batch !== 'pilot' && batch !== 'None') {
              let bn = parseInt(batch, 10)
              const endIdx = startIdx + this.videosByBatch[batch].length
              if(isOldBatch) {
                label = `${bn}: Videos ${startIdx + 1}-${endIdx} (${endIdx- startIdx} videos)`
              } else if(isNewBatch) {
                label = `${bn}: Videos ${startIdx + 1}-${endIdx} (${endIdx- startIdx} videos) **NEW**`
              }
              startIdx = endIdx
              createOption(label, batch, false, this.batchSelector)
            } else if(batch === 'pilot') {
              label = 'Pilot Videos'
              createOption(label, batch, false, this.batchSelector)
            }
          }

          this.expertiseSelector.value = catName
          this.updateVideosForExpertise()
          if(onReady) { 
            onReady()
          }
        }
      })
    }

    this.userId.addEventListener("input", (e) => {
      this.checkUser()
    })
  }

  getVideoContainer() {
    if(!this.viewVideo) {
      return null;
    }
    return this.viewVideo.container.video
  }

  isPlaying() {
    if(!this.viewVideo) {
      return false;
    }
    return this.viewVideo.container.isPlaying()
  }

  async init() {
    // ui elements
    this.openAnnotationBtn = document.getElementById("openAnnotationBtn")
    this.annotationFileSelector = document.getElementById("annotationFile")
    this.taskInfo = document.getElementById("taskInfo")
    this.recordSideBar = document.getElementById("recordSideBar")
    this.micVolumeBar = document.getElementById("micVolumeBar")
    this.muteButton = document.getElementById("muteBtn")
    this.volumeBar = document.getElementById("volumeBar")
    this.volumeLevel = document.getElementById("volumeLevel")
    this.micSelector = document.getElementById("mic")
    this.recordBtn = document.getElementById("recordBtn")
    this.playBtn = document.getElementById("playBtn")
    this.nextFrameBtn = document.getElementById("nextFrameBtn")
    this.prevFrameBtn = document.getElementById("prevFrameBtn")
    this.audioList = document.getElementById("audioList")
    this.playBar = document.getElementById("playBar")
    this.timeInfo = document.getElementById("timeInfo")
    this.frameInfo = document.getElementById("frameInfo")
    this.submitBtn = document.getElementById("submitBtn")
    this.rejectBtn = document.getElementById("rejectBtn")
    this.clearStrokeBtn = document.getElementById("clearStrokeBtn")
    this.mainMenuBtn = document.getElementById("mainMenuBtn")
    this.shortcutsBtn = document.getElementById("shortcutsBtn")
    this.settingsBtn = document.getElementById("settingsBtn")
    this.mainScreen = document.getElementById("mainScreen")
    this.shortcutsScreen = document.getElementById("shortcutsScreen")
    this.settingsScreen = document.getElementById("settingsScreen")
    this.playSpeedSelectors = {}
    for(const name of [
      "speedSelect25x",
      "speedSelect50x",
      "speedSelect75x",
      "speedSelect100x",
      "speedSelect125x",
      "speedSelect150x",
      "speedSelect175x",
      "speedSelect200x",
      "speedSelect300x",
      "speedSelect400x",
    ]) {
      let value = name.substring(11)
      value = value.substring(0, value.length - 1)
      value = parseInt(value)
      this.playSpeedSelectors[value] = document.getElementById(name)
      this.playSpeedSelectors[value].addEventListener("click", () => {
        this.setPlaybackSpeed(value / 100)
      })
      disableFocusForClickable(this.playSpeedSelectors[value])
    }
    disableFocusForSlider(this.volumeBar)
    this.proficiencyWhyText = document.getElementById("proficiencyWhyText")
    this.profiencyScoreSelector = document.getElementById("proficiencyScore")

    this.mode = MODE_ANNOTATE
    this.replayDatum = null
    this.currRecNode = null

    // active screen
    this.prevScreen = undefined
    this.activeScreen = START_SCREEN

    // player state
    this.playDisabled = false

    // recorder state
    this.recordedEvents = []
    this.isRecording = false
    this.recordDisabled = false
    this.recordTime = null
    this.recordStartAppTime = null
    this.wasPlaying = false

    // annotation submit/reject state
    this.submitting = false
    this.hasSubmitted = false

    // simple state machine for slider, ref https://stackoverflow.com/a/61568207
    this.playBar.min = 0
    this.playBar.value = 0
    this.playBar.max = undefined
    this.sliderChanging = false;
    disableFocusForSlider(this.playBar)
    this.playBar.addEventListener("mousedown", () => {
      if(this.playDisabled) return;
      this.sliderChanging = true;
    });
    this.playBar.addEventListener("mouseup", () => {
      if(this.playDisabled) return;
      this.sliderChanging = false;
      if(this.viewVideo) {
        this.viewVideo.container.seek(this.playBar.value / 1000, () => {
          this.updateTimeline()
        });
        this.updateTimeline()
      }
    });
    this.playBar.addEventListener("mousemove", () => {
      if(this.playDisabled) return;
      if(this.sliderChanging && this.viewVideo) {
        this.viewVideo.container.seek(this.playBar.value / 1000)
        this.updateTimeline()
      }
    });

    this.setPlaybackSpeed = (speed) => {
      if(this.viewVideo) {
        this.viewVideo.container.video.playbackRate = speed;
        this.addEvent({type: "video", action: "playback_speed", value: speed, is_playing: this.isPlaying(), "video_time": this.viewVideo.container.video.currentTime})
      }
    }
    this.addEvent = (x) => {
      if(this.isRecording) {
        this.recordedEvents.push({...x, "global_time": timeNow()})
      }
    }
    this.submitAnn = () => {
      if(this.submitting) {
        return;
      }
      const profWhyText = this.proficiencyWhyText.value
      const profRating = this.profiencyScoreSelector.value
      if(profRating != "N/A" && (!profWhyText || !profRating)) {
        alert("Please input a proficiency rating and reason")
        return;
      }

      var zip = new JSZip();
      var vids = zip.folder("recordings");
      let data = []
      let recordings = []
      for(const recId in this.recorder.recordingsById) {
        recordings.push(this.recorder.recordingsById[recId])
      }

      recordings.sort((a, b) => {
        return a.id - b.id
      })
      for(const idx in recordings) {
        const recording = recordings[idx]
        const path = `${idx}.${RECORDING_EXT}`
        vids.file(path, recording.blob, {type: "blob"})
        const exportData = {...recording.data, "recording_path": path}
        data.push(exportData)
      }
      const dt = new Date()
      const exportData = {
        "user_id": this.userId.value,
        "video_name": this.videoName,
        "datetime": dt.toUTCString(),
        "ds": dt.getTime(),
        "annotations": data,
        "proficiency": {
          "why": profWhyText,
          "rating": profRating,
        }
      }
      zip.file("data.json", JSON.stringify(
        exportData
      ))
      this.submitting = true;
      zip.generateAsync({type: "blob"}).then((content) => {
        saveFile(content, `${this.userId.value}_${this.videoName}.zip`);
        this.submitting = false
        this.hasSubmitted = true
      });
    }
    this.rejectAnn = () => {
      console.debug("reject")
    }
    this.toggleRecord = () => {
      if(this.recordDisabled || !this.viewVideo || this.mode !== MODE_ANNOTATE) {
        return;
      }
      if(!this.isRecording) {
        if(this.isPlaying()) {
          this.pause()
          this.wasPlaying = true
        } else {
          this.wasPlaying = false
        }

        this.recorder.start()
        this.isRecording = true
        this.recordStartAppTime = timeNow()
        this.recordTime = this.viewVideo.container.video.currentTime
        addStyle(this.recordSideBar, RECORDING_BORDER_CLASSES)
        this.recordBtn.innerHTML = "Stop Recording"
        if(!ENABLE_REPLAY) {
          this.playDisabled = true
        }
      } else {
        this.recorder.stop()
        // TODO: set style disabled
        this.recordDisabled = true
        this.recordBtn.innerHTML = "Record"
        removeStyle(this.recordSideBar, RECORDING_BORDER_CLASSES)
      }
    }
    this.pause = () => {
      if(!this.isPlaying()) return;
      this.addEvent({type: "video", action: "pause", video_time: this.viewVideo.container.currentTime})
      this.viewVideo.container.pause()
      this.playBtn.innerHTML = "Play"
    }
    this.play = () => {
      if(this.playDisabled || !this.viewVideo || this.mode !== MODE_ANNOTATE) {
        return;
      }
      if(this.isRecording) {
        this.mute()
      } else if(this.draw.paths.length > 0) {
        this.draw.paths = []
      }
      const vidCont = this.viewVideo.container.video
      this.addEvent({
        type: "video",
        action: "play",
        video_time: vidCont.currentTime,
        playback_speed: vidCont.playbackRate,
        muted: vidCont.muted,
        volume: vidCont.volume,
      })
      this.viewVideo.container.play()
      this.playBtn.innerHTML = "Pause"
    }
    this.togglePlay = () => {
      if(this.isPlaying()) {
        this.pause()
      } else {
        this.play()
      }
    }
    this.nextFrame = () => {
      if(!ENABLE_REPLAY && this.isRecording) {
        return;
      }

      if(this.playDisabled || !this.viewVideo || this.mode !== MODE_ANNOTATE) {
        return;
      }

      const vidCont = this.getVideoContainer()
      if(!vidCont) return;
      vidCont.currentTime += 1/30.0
      this.addEvent({
        type: "video",
        action: "next_frame",
        video_time: vidCont.currentTime,
        playback_speed: vidCont.playbackRate,
        muted: vidCont.muted,
        volume: vidCont.volume,
      })
      this.updateTimeline()
    }
    this.prevFrame = () => {
      if(!ENABLE_REPLAY && this.isRecording) {
        return;
      }
      if(this.playDisabled || !this.viewVideo || this.mode !== MODE_ANNOTATE) {
        return;
      }

      const vidCont = this.getVideoContainer()
      if(!vidCont) return;
      vidCont.currentTime -= 1/30.0
      this.addEvent({
        type: "video",
        action: "prev_frame",
        video_time: vidCont.currentTime,
        playback_speed: vidCont.playbackRate,
        muted: vidCont.muted,
        volume: vidCont.volume,
      })
      this.updateTimeline()
    }
    this.addRecording = (x) => {
      let src = x.url
      let node = document.createElement("li")

      let timeButton = document.createElement("button")
      let recordTime = x.video_time;
      let dur = x.duration_approx
      timeButton.innerHTML = `Time: ${recordTime.toFixed(3)} (${dur.toFixed(2)}s)`
      timeButton.className = TIME_BUTTON_CLASSES
      timeButton.addEventListener("click", () => {
        if(this.viewVideo) {
          this.viewVideo.container.video.currentTime = recordTime;
          this.updateTimeline()
        }
      });

      let delButton = document.createElement("button")
      delButton.innerHTML = "Delete"
      delButton.className = DELETE_BUTTON_CLASSES
      delButton.addEventListener("click", (e) => {
        this.recorder.remove(x.id)
        this.audioList.removeChild(node)
      });
      disableFocusForClickable(timeButton)
      disableFocusForClickable(delButton)
      let split = document.createElement("hr")
      split.className = "w-full h-px my-2 bg-gray-400 border-0"
      node.appendChild(split)
      node.appendChild(timeButton)
      node.appendChild(delButton)

      let tag = this.recorder.videoEnabled ? "video": "audio"
      let recNode = document.createElement(tag)
      recNode.src = src
      recNode.setAttribute("controls", "controls")

      let replayButton = document.createElement("button")
      replayButton.innerHTML = "Replay"
      replayButton.className = REPLAY_ANN_BUTTON_CLASSES
      recNode.addEventListener("play", () => {
        // TODO: 
        // can we stop the play until the video has seeked to the
        // appropriate time?
        if(this.currRecNode !== recNode && this.currRecNode) {
          this.currRecNode.pause()
          this.currRecNode.currentTime = 0
          this.draw.paths = []
        }
        if(recordTime !== this.viewVideo.container.video.currentTime) {
          recNode.pause()
          recNode.currentTime = 0
        }
        this.mode = MODE_REPLAY
        this.currRecNode = recNode
        this.replayDatum = x
        this.pause()
        this.viewVideo.container.seek(recordTime, () => {
          this.updateTimeline()
          recNode.play()
          recNode.currentTime = 0
        })
      })
      recNode.addEventListener("pause", () => {
        if(recNode === this.currRecNode) {
          this.mode = MODE_ANNOTATE
        }
      })
      recNode.addEventListener("ended", () => {
        if(recNode === this.currRecNode) {
          this.mode = MODE_ANNOTATE
          this.draw.paths = []
        }
      })
      replayButton.addEventListener("click", () => {
        if(this.isRecording || !this.viewVideo) {
          return;
        }
        recNode.currentTime = 0
        recNode.play().catch(() => {})
      });
      disableFocusForClickable(replayButton)
      node.appendChild(replayButton)

      // if(false) { // TODO: for proficiency
      //   let checkboxDiv = document.createElement("div")
      //   for(const tag of ["Good Execution", "Tip for Improvement"]) {
      //     const nospaceTag = tag.split(" ").join("_")
      //     let checkbox = document.createElement("input")
      //     checkbox.type = "checkbox"
      //     checkbox.value = nospaceTag
      //     checkbox.name = nospaceTag
      //     checkbox.id = nospaceTag
      //     let label = document.createElement("label")
      //     label.htmlFor = nospaceTag
      //     label.innerHTML = tag

      //     checkbox.className = "ml-2 text-sm font-medium"
      //     label.className = "m-2 border-gray-300 rounded"
      //     let container = document.createElement("div")
      //     container.appendChild(checkbox)
      //     container.appendChild(label)
      //     checkboxDiv.appendChild(container)
      //   }
      //   node.appendChild(checkboxDiv)
      // }

      let infoText = document.createElement("div")
      infoText.className = "m-1 text-sm"
      if(x.events.length > 0) {
        infoText.innerHTML = "Contains Stroke"
      } else {
        infoText.innerHTML = "No Stroke"
      }
      disableFocusForClickable(infoText)
      node.appendChild(infoText)

      // TODO: add play event for recNode
      disableFocusForClickable(recNode)
      node.appendChild(recNode)

      audioList.prepend(node);
    }

    this.endRecording = (x) => {
      let endTime = timeNow()
      let dur = (endTime - this.recordStartAppTime) / 1000
      this.finishStrokes()
      x.data = {
        video_time: this.recordTime,
        start_global_time: this.recordStartAppTime,
        end_global_time: endTime,
        events: deepCopy(this.recordedEvents),
        duration_approx: dur,
      }
      this.addRecording({
        ...x.data,
        ...x,
      })
      this.recordTime = null
      this.recordDisabled = false
      this.recordStartAppTime = null
      this.recordedEvents = []
      this.isRecording = false
      this.playDisabled = false
      this.hasSubmitted = false
      // TODO: add option for whether we want auto-play?
      if(this.wasPlaying && ENABLE_AUTOPLAY) {
        this.play()
        this.wasPlaying = false
      }
      this.resetDrawCanvas()
    }
    this.clearAnnotations = () => {
      this.recorder.clearRecordings()
      this.audioList.innerHTML = ""
    }
    this.getScreen = (screen_id) => {
      if(!screen_id) {
        return null
      }

      switch(screen_id) {
        case MAIN_SCREEN: {
          return this.mainScreen
        }
        case SETTINGS_SCREEN: {
          return this.settingsScreen
        }
        case SHORTCUTS_SCREEN: {
          return this.shortcutsScreen
        }
      }
    }
    this.setScreen = (screen) => {
      if(!screen) {
        return;
      }
      if(this.activeScreen === screen) {
        return;
      }

      this.prevScreen = this.activeScreen
      this.activeScreen = screen
      const a = this.getScreen(this.activeScreen)
      const b = this.getScreen(this.prevScreen)
      show(a)
      hide(b)
      if(this.activeScreen !== MAIN_SCREEN) {
        this.pause()
      }
      this.draw.onResize()
    }
    this.showPrevScreen = () => {
      this.setScreen(this.prevScreen)
    }
    this.toggleScreen = (screen_id, other_screen) => {
      if(this.activeScreen !== screen_id) {
        this.setScreen(screen_id)
      } else {
        if(other_screen) {
          this.setScreen(other_screen)
        }
        else {
          this.showPrevScreen()
        }
      }
    }
    this.mute = () => {
      if(this.viewVideo) {
        const vidCont = this.viewVideo.container.video
        vidCont.muted = true;
        this.muteButton.innerHTML = "Unmute";
      }
    }
    this.unmute = () => {
      if(this.viewVideo) {
        const vidCont = this.viewVideo.container.video
        vidCont.muted = false;
        this.muteButton.innerHTML = "Mute";
      }
    }
    this.toggleMute = () => {
      const vidCont = this.viewVideo.container.video
      vidCont.muted = !vidCont.muted;
      this.muteButton.innerHTML = vidCont.muted ? "Unmute" : "Mute";
    }
    this.setVolume = (vol) => {
      const vidCont = this.viewVideo.container.video
      vidCont.volume = vol / 100
      this.volumeLevel.innerHTML = `${vol}%`
    }
    this.playBtn.addEventListener("click", this.togglePlay)
    this.nextFrameBtn.addEventListener("click", this.nextFrame);
    this.prevFrameBtn.addEventListener("click", this.prevFrame);
    this.recordBtn.addEventListener("click", this.toggleRecord)
    this.submitBtn.addEventListener("click", this.submitAnn)
    this.rejectBtn.addEventListener("click", this.rejectAnn)
    this.mainMenuBtn.addEventListener("click", () => { this.setScreen(MAIN_SCREEN) })
    this.shortcutsBtn.addEventListener("click", () => { this.toggleScreen(SHORTCUTS_SCREEN) })
    this.settingsBtn.addEventListener("click", () => { this.toggleScreen(SETTINGS_SCREEN) })
    this.muteButton.addEventListener("click", this.toggleMute)
    this.volumeBar.addEventListener("change", (e) => {
      this.setVolume(this.volumeBar.value)
    })

    const allButtons = [this.playBtn, this.nextFrameBtn, this.prevFrameBtn, this.recordBtn, this.submitBtn, this.rejectBtn, this.mainMenuBtn, this.shortcutsBtn, this.settingsBtn, this.clearStrokeBtn, this.muteButton]
    for(const but of allButtons) {
      disableFocusForClickable(but)
    }

    // shortcuts
    document.addEventListener("keyup", (e) => {
      const isTextInput = document.activeElement.tagName.toLowerCase() === "input" && document.activeElement.type === "text"
      const isTextArea = document.activeElement.tagName.toLowerCase() === "textarea"
      if(isTextArea || isTextInput) {
        return;
      }
      if(e.key === " ") {
        this.togglePlay()
      } else if (e.key === "r" || e.key == "R" || e.key == "Enter") {
        this.toggleRecord()
      } else if(e.key === "?") {
        this.showPrevScreen()
      } else if(e.key === "Escape") {
        this.toggleScreen(SETTINGS_SCREEN, MAIN_SCREEN)
      } else if(e.key == "c" || e.key == "C") {
        this.clearStroke()
      } else if(e.key === "m" || e.key === "M") {
        this.toggleMute()
      } else if(e.key === "n" || e.key === "N") {
        this.nextVideo()
      } else if(e.key === "p" || e.key === "P") {
        this.prevVideo()
      }
    });
    document.addEventListener("keydown", (e) => {
      const isTextInput = document.activeElement.tagName.toLowerCase() === "input" && document.activeElement.type === "text"
      const isTextArea = document.activeElement.tagName.toLowerCase() === "textarea"
      if(isTextArea || isTextInput) {
        return;
      }
      if(e.key == " ") {
        e.preventDefault()
      }

      if (e.key === "." || e.key === "ArrowRight") {
        this.nextFrame()
      } else if (e.key === "," || e.key === "ArrowLeft") {
        this.prevFrame()
      } else if(e.key === "?") {
        this.setScreen(SHORTCUTS_SCREEN)
      }
    });

    this.openAnnotation = (data, path) => {
      var zip = new JSZip();
      zip.loadAsync(data).then((content) => {
        const dataJsonFile = content.file("data.json")
        if(!dataJsonFile) {
          alert(`Could not load file: ${path}`)
          return;
        }

        dataJsonFile.async("string").then((str) => {
          const dataJson = JSON.parse(str)
          this.userId.value = dataJson["user_id"]
          this.checkUser(() => {

            const videoName = dataJson["video_name"]
            let found = false;
            let videoIdx = 0
            let batch = null
            for(const b in this.videosByBatch) {
              for(var idx = 0; idx < this.videosByBatch[b].length; ++idx) {
                if(this.videosByBatch[b][idx]["name"] == videoName) {
                  found = true;
                  videoIdx = idx;
                  batch = b;
                  break;
                }
              }
              if(found) {
                break;
              }
            }
            if(batch) {
              this.batchSelector.value = batch
              this.updateBatch()
            }

            if(!found) {
              alert(`Could not find name: ${name}`)
              videoIdx = -1;
              return;
            }

            let recs = []
            for(const ann of dataJson["annotations"]) {
              const path = ann["recording_path"]
              const rec = content.files[`recordings/${path}`]
              const x = rec.async("blob")
              recs.push(x)
            }
            Promise.all(recs).then((blobs) => {
              // populate the UI
              this.openVideoByInfo(this.videosToAnnotate[videoIdx], () => {
                for(const idx in dataJson["annotations"]) {
                  const blob = blobs[idx]
                  const ann = dataJson["annotations"][idx]
                  const data = {
                    url: URL.createObjectURL(blob),
                    ...ann,
                  }
                  this.recorder.addRecording(data.url, blob, false, data, ann)
                  this.addRecording(data)
                }
                this.profiencyScoreSelector.value = dataJson["proficiency"]["rating"]
                this.proficiencyWhyText.value = dataJson["proficiency"]["why"]
              }, true)
            })
          })
        })
      })
    }

    this.openAnnotationBtn.addEventListener("click", () => { 
      let files = this.annotationFileSelector.files
      if(files.length > 1) {
        let errStr = "Please open only *one* file ending with .zip"
        console.error(errStr)
        alert(errStr)
      }
      this.openAnnotation(files[0].arrayBuffer(), files[0].name)
    })

    this.initDrawCanvas()
    await this.initSettings()
  }

  runDrawLoop() {
    let then = 0;
    let ctx = this
    function render(now) {
      now *= 0.001; // to seconds
      const dt = now - then;
      then = now;

      if(ctx.mode === MODE_REPLAY && ctx.currRecNode) {
        if(isPlaying(ctx.currRecNode)) {
          ctx.draw.paths = []  // TODO: fixme this is not efficient
          const recNodeT = ctx.currRecNode.currentTime * 1000
          const replayDatum = ctx.replayDatum
          const startGlobal = replayDatum.start_global_time
          for(const event of replayDatum.events) {
            if(event.type === "path") {
              const eventRelT = event.global_time - startGlobal
              if(event.action === "clear" && recNodeT > eventRelT) {
                ctx.draw.paths = []
              } else {
                for(const path of event.paths) {
                  const t = path.to.t
                  const relT = t - startGlobal
                  if(recNodeT > relT) {
                    ctx.draw.paths.push(path)
                  } else {
                    break;
                  }
                }
              }
            }
          }
        }
      }

      if(ctx.activeScreen == MAIN_SCREEN) {
        ctx.draw.renderFrame(dt);
        if(!ctx.sliderChanging && ctx.isPlaying()) {
          ctx.updateTimeline()
        }
      }
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }
}


async function main() {
  const canvas = document.querySelector("#glcanvas");
  if(!canvas) {
    console.error("no canvas provided");
    return;
  }
  let ctx = new App();
  let err = await ctx.setup(canvas);
  if(err) {
    alert(err)
  }

  await ctx.init();
  ctx.runDrawLoop();
}


await main(null);
