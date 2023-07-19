"use strict";

const MAIN_SCREEN = 1
const SETTINGS_SCREEN = 2
const SHORTCUTS_SCREEN = 3
const START_SCREEN = SETTINGS_SCREEN

const BASE_LINE_WIDTH_PER_1K_PX = 8;
const MIN_LINE_WIDTH = 3;

const RECORDING_EXT = "webm"
const VIDEO_RECORDING_TYPE = `video/${RECORDING_EXT}`
const AUDIO_RECORDING_TYPE = `audio/${RECORDING_EXT}`
const DELETE_BUTTON_CLASSES = "m-1 px-4 py-1 text-sm text-white-600 font-semibold rounded-full border border-white-600 hover:text-black hover:bg-black-600 hover:border-black-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
const REPLAY_ANN_BUTTON_CLASSES = "m-1 px-4 py-1 text-sm text-white-600 font-semibold rounded-full border border-white-600 hover:text-black hover:bg-black-600 hover:border-black-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
const FPS = 30; // TODO: use mp4jsbox to get frame rate?

const deepCopy = (x) => {
  // NOTE(miguelmartin): is there a better way to deep copy?
  return JSON.parse(JSON.stringify(x))
}

const timeNow = () => {
  //return Date.now()
  return performance.now()
}

const createOption = (label, value, isSelected, parentNode) => {
  const node = document.createElement("option")
  node.innerHTML = label
  node.selected = isSelected;
  node.value = value
  if(parentNode) parentNode.appendChild(node);
  return node;
};

const disableFocusForElement = (el) => {
    el.addEventListener("mousedown", (e) => {
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
  setup(stream, newRecordingCb, hasVideo) {
    if(!stream) {
      return "no stream given"
    }
    this.currentBlobs = []
    this.recordings = []
    this.currentId = 0

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
      let blob = new Blob(this.currentBlobs, { type: recordingType })
      let url = URL.createObjectURL(blob)
      let curr = {url: url, blob: blob}
      this.recordings.unshift(curr)
      this.currentBlobs = []
      this.newRecordingCb(curr)
      this.currentId += 1
    })

    this.mediaRecorder.addEventListener('dataavailable', event => {
      this.currentBlobs.push(event.data)
    })
    return null;
  }

  remove(id) {
    for(var idx in this.recordings) {
      var x = this.recordings[idx]
      if(x.id == id) {
        this.recordings.splice(idx, 1)
        break
      }
    }
  }

  start() {
    // TODO: catch errors
    this.mediaRecorder.start()
  }

  stop() {
    this.mediaRecorder.stop()
  }
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
    this.video.muted = true; // TODO: configure
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
      // do nothing
    });
  }

  play() {
    this.video.play(() => {
      this.playing = true;
    }).catch(err => {
      this.on_play_fail(err)
    });
  }

  pause() {
    this.video.pause();
  }

  is_ready() {
    return this.ready;
  }
}

function resizeCanvas(canvas, ctx) {
  let multiplier = 1
  multiplier = multiplier || 1;
  const width  = canvas.clientWidth  * multiplier | 0;
  const height = canvas.clientHeight * multiplier | 0;
  const fontSize = Math.round(canvas.height / 10)
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
    const gl = canvas.getContext("2d");
    this.canvas = canvas;
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
    // TODO
    // if(!this.enableVideo) {
    //   const textX = cW / 4;
    //   const textY = cH / 2;
    //   const text = "Open Settings (press ESC)";
    //   this.gl.fillText(text, textX, textY);
    //   return;
    // }
    for(const {container, drawData} of this.videos) {
      // TODO: use drawData
      if(container.is_ready()) {
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

class Narrator {

  async createRecorder(videoDevice, micDevice) {
    let err = null 

    if(this.stream) {
      var tracks = this.stream.getTracks();
      for(var i = 0; i < tracks.length; i++){
        tracks[i].stop();
      }
    }
    
    console.log("videoDevice", videoDevice)
    let media = { }
    if(videoDevice !== "_none") {
      media["video"] = {deviceId: videoDevice}
    } else {
      media["video"] = false
    }
    if(micDevice !== "_none") {
      media["audio"] = {deviceId: micDevice}
    } else {
      media["audio"] = false
    }
    console.log("media=", media)

    this.stream = await navigator.mediaDevices.getUserMedia(media)
    var tracks = this.stream.getTracks();
    for(var i = 0; i < tracks.length; i++){
      if(tracks[i].kind === "audio") {
        this.selectMicDevice(tracks[i].getSettings().deviceId)
      } else {
        this.selectVideoDevice(tracks[i].getSettings().deviceId)
      }
    }

    this.recorder = new Recorder()
    err = this.recorder.setup(this.stream, this._recordingCreated, media["video"] !== false)
    if(err) {
      return err
    }
    this.recorder.recordingCreatedCb = (x) => {
      this.endRecording(x)
    }
    this.settingsPreviewVideo.autoplay = true
    this.settingsPreviewVideo.muted = true
    this.settingsPreviewVideo.srcObject = this.stream;
    return err
  }

  openVideo(url) {
    console.log("Opened:", url)
    this.draw.removeVideos()
    this.viewVideo = this.draw.addCreateVideo(url, () => {
      this.pause()
      this.draw.onResize()
    });
    let ctx = this;
    this.viewVideo.container.video.onloadedmetadata = function() {
      ctx.playBar.max = this.duration;
    };
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
      if(this.isRecording && this.draw.paths.length > 0) {
        this.addEvent({type: "path", action: null, paths: deepCopy(this.draw.paths)})
      }
    }

    this.clearStroke = () => {
      if(this.isRecording) {
        this.addEvent({type: "path", action: "clear", paths: deepCopy(this.draw.paths)})
      }
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
    this.playBar.value = this.viewVideo.container.video.currentTime
    this.timeInfo.innerHTML = `${this.viewVideo.container.video.currentTime}`
    this.frameInfo.innerHTML = `${Math.floor(this.viewVideo.container.video.currentTime * FPS)}`
  }

  async initSettings() {
    this.metadata = {}
    this.devById = {}

    this.expertiseSelector = document.getElementById("expertise")
    this.videoSelector = document.getElementById("videoSelect")
    this.startAnnotatingBtn = document.getElementById("startAnnotatingBtn")

    this.cameraSelector = document.getElementById("cam")
    this.micSelector = document.getElementById("mic")
    this.settingsPreviewVideo = document.getElementById("settingsPreviewVideo")
    this.videoFileInput = document.getElementById("videoFile")
    this.videoFileInput.addEventListener("change", () => {
      // TODO: support multiple files
      console.log("opened:", this.videoFileInput.files)
      this.openVideo(URL.createObjectURL(this.videoFileInput.files[0]))
      // this.videoFileInput.files[0]
    }, false);


    this.addVideoDevice = (x, isSelected) => {
      createOption(x.label, x.deviceId, isSelected, this.cameraSelector);
    }

    this.addAudioDevice = (x, isSelected) => {
      createOption(x.label, x.deviceId, isSelected, this.micSelector);
    }

    // setup devices
    this.devices = await navigator.mediaDevices.enumerateDevices()
    let micDevice = null
    let videoDevice = "_none"
    for (var idx in this.devices) {
      const dev = this.devices[idx];
      const isDefault = dev.deviceId === "default";
      const isAudioInp = dev.kind === "audioinput";
      const isVideoInp = dev.kind === "videoinput";
      this.devById[dev.deviceId] = dev;
      if(isAudioInp) {
        this.addAudioDevice(dev, isDefault)
        if(isDefault) {
          micDevice = dev.deviceId
        }
      } else if(isVideoInp) {
        this.addVideoDevice(dev, isDefault)
      }
    }

    this.camOrMicChanged = () => {
      const camDevId = this.cameraSelector.value;
      const micDevId = this.micSelector.value;
      this.createRecorder(camDevId, micDevId)
    }
    this.cameraSelector.addEventListener("change", this.camOrMicChanged)
    this.micSelector.addEventListener("change", this.camOrMicChanged)

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
    this.startAnnotatingBtn.addEventListener("click", () => {
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
            "category": "todo",
            "video": "todo",
          })
        }
      ).then(r => r.json()).then(x => {
        console.log("response", x)
        this.openVideo(x["path"])
        this.setScreen(MAIN_SCREEN)
      })
    });

    this.updateVideosForExpertise = () => {
      this.videoSelector.innerHTML = "";
      let catName = this.expertiseSelector.value;
      let names = this.metadata["by_category"][catName];
      for(let name of names) {
        createOption(name, name, false, this.videoSelector)
      }
    }
    this.expertiseSelector.addEventListener("change", this.updateVideosForExpertise)
    this.videoSelector.addEventListener("change", () => {
    })

    fetch("/metadata").then(r => r.json()).then(x => {
      this.metadata = x

      // populate the UI
      this.expertiseSelector.innerHTML = "";
      for(let catName in this.metadata["by_category"]) {
        createOption(catName, catName, false, this.expertiseSelector)
      }
      this.updateVideosForExpertise()
    })

    let err = await this.createRecorder(videoDevice, micDevice)
    if(err) return err;
  }

  async init() {
    // ui elements
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

    // active screen
    this.prevScreen = undefined
    this.activeScreen = START_SCREEN

    // player state
    this.isPlaying = false
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

    // simple state machine for slider, ref https://stackoverflow.com/a/61568207
    this.playBar.min = 0
    this.playBar.value = 0
    this.playBar.max = undefined
    this.sliderChanging = false;
    this.playBar.addEventListener("keydown", (e) => {
      e.preventDefault()
    })
    this.playBar.addEventListener("keyup", (e) => {
      e.preventDefault()
    })
    this.playBar.addEventListener("mousedown", () => {
      this.sliderChanging = true;
    });
    this.playBar.addEventListener("mouseup", () => {
      this.sliderChanging = false;
      if(this.viewVideo) {
        this.viewVideo.container.video.currentTime = this.playBar.value;
        this.updateTimeline()
      }
    });
    this.playBar.addEventListener("mousemove", () => {
      if(this.sliderChanging && this.viewVideo) {
        this.viewVideo.container.video.currentTime = this.playBar.value;
        this.updateTimeline()
      }
    });
    this.playBar.addEventListener("onchange", (value) => {
      console.log("value change", value)
    })

    this.addEvent = (x) => {
      this.recordedEvents.push({...x, "time": timeNow()})
    }
    this.submitAnn = () => {
      // TODO: animation
      if(this.submitting) {
        return;
      }
      var zip = new JSZip();
      var vids = zip.folder("recordings");
      let data = []
      for(const idx in this.recorder.recordings) {
        const recording = this.recorder.recordings[idx]
        const path = `${idx}.${RECORDING_EXT}`
        vids.file(path, recording.blob, {type: "blob"})
        const exportData = {...recording.data, "recording_path": path}
        console.log("recording.data=", recording.data, exportData)
        data.push(exportData)
      }
      zip.file("data.json", JSON.stringify(
        data
      ))
      this.submitting = true;
      zip.generateAsync({type: "blob"}).then((content) => {
        // TODO: if(local)
        saveFile(content, "annotations.zip");
        this.submitting = false
      });
    }
    this.rejectAnn = () => {
      console.debug("reject")
    }
    this.toggleRecord = () => {
      if(this.recordDisabled || !this.viewVideo) {
        return;
      }
      if(!this.isRecording) {
        if(this.isPlaying) {
          this.pause()
          this.wasPlaying = true
        } else {
          this.wasPlaying = false
        }

        this.recorder.start()
        this.isRecording = true
        // TODO: configuration option?
        // this.playDisabled = true
        this.recordStartAppTime = timeNow()
        this.recordTime = this.viewVideo.container.video.currentTime
        this.recordBtn.innerHTML = "Stop Recording"
      } else {
        this.recorder.stop()
        // TODO: set style disabled
        this.recordDisabled = true
        this.recordBtn.innerHTML = "Record"
      }
    }
    this.pause = () => {
      if(!this.viewVideo || !this.isPlaying) return;
      if(this.isRecording) {
        this.addEvent({type: "video", action: "pause", video_time: this.viewVideo.container.currentTime})
      }
      this.viewVideo.container.pause()
      this.isPlaying = false
      this.playBtn.innerHTML = "Play"
    }
    this.play = () => {
      if(this.playDisabled || !this.viewVideo) {
        return;
      }
      if(this.isRecording) {
        this.addEvent({type: "video", action: "play", video_time: this.viewVideo.container.currentTime})
      }
      this.viewVideo.container.play()
      this.isPlaying = true
      this.playBtn.innerHTML = "Pause"
    }
    this.togglePlay = () => {
      if(this.isPlaying) {
        this.pause()
      } else {
        this.play()
      }
    }
    this.nextFrame = () => {
      this.viewVideo.container.video.currentTime += 1/30.0
      if(this.isRecording) {
        this.addEvent({type: "video", action: "next_frame", video_time: this.viewVideo.container.currentTime})
      }
      this.updateTimeline()
    }
    this.prevFrame = () => {
      this.viewVideo.container.video.currentTime -= 1/30.0
      if(this.isRecording) {
        this.addEvent({type: "video", action: "prev_frame", video_time: this.viewVideo.container.currentTime})
      }
      this.updateTimeline()
    }
    this.endRecording = (x) => {
        let endTime = timeNow()

        // NOTE: actually video
        // TODO: log the data here including paths
        let src = x.url
        let node = document.createElement("li")
        node.innerHTML = `Time: ${this.recordTime} `

        let tag = this.recorder.videoEnabled ? "video": "audio"
        let recNode = document.createElement(tag)
        recNode.src = src
        recNode.setAttribute("controls", "controls")

        let delButton = document.createElement("button")
        delButton.innerHTML = "Delete"
        delButton.className = DELETE_BUTTON_CLASSES
        delButton.addEventListener("click", (event) => {
          console.log("delete clicked")
        });
        let replayButton = document.createElement("button")
        replayButton.innerHTML = "Replay"
        replayButton.className = REPLAY_ANN_BUTTON_CLASSES
        replayButton.addEventListener("click", (event) => {
          console.log("replay clicked")
        });
        disableFocusForElement(recNode)
        disableFocusForElement(delButton)
        disableFocusForElement(replayButton)
        node.appendChild(delButton)
        node.appendChild(replayButton)
        node.appendChild(recNode)

        audioList.prepend(node);
        this.finishStrokes()
        x.data = {
          video_time: this.recordTime,
          start_global_time: this.recordStartAppTime,
          end_global_time: endTime,
          events: deepCopy(this.recordedEvents)
        }
        this.recordTime = null
        this.recordDisabled = false
        this.recordStartAppTime = null
        this.recordedEvents = []
        this.isRecording = false
        // TODO: add option for whether we want auto-play?
        if(this.wasPlaying) {
          this.play()
          this.wasPlaying = false
        }
        this.resetDrawCanvas()
    }
    this.deleteRecording = (idx) => {
      this.recorder.remove(idx)
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
        console.log("active is same", this.activeScreen, screen)
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
      console.log("showing previous screen", this.prevScreen, "curr=", this.activeScreen)
      this.setScreen(this.prevScreen)
    }
    this.toggleScreen = (screen_id, other_screen) => {
      if(this.activeScreen !== screen_id) {
        console.log("setting", screen_id, this.activeScreen, this.activeScreen === screen_id)
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
    // TODO: add delete
    this.playBtn.addEventListener("click", this.togglePlay)
    this.nextFrameBtn.addEventListener("click", this.nextFrame);
    this.prevFrameBtn.addEventListener("click", this.prevFrame);
    this.recordBtn.addEventListener("click", this.toggleRecord)
    this.submitBtn.addEventListener("click", this.submitAnn)
    this.rejectBtn.addEventListener("click", this.rejectAnn)
    this.mainMenuBtn.addEventListener("click", () => { this.setScreen(MAIN_SCREEN) })
    this.shortcutsBtn.addEventListener("click", () => { this.toggleScreen(SHORTCUTS_SCREEN) })
    this.settingsBtn.addEventListener("click", () => { this.toggleScreen(SETTINGS_SCREEN) })

    const allButtons = [this.playBtn, this.nextFrameBtn, this.prevFrameBtn, this.recordBtn, this.submitBtn, this.rejectBtn, this.mainMenuBtn, this.shortcutsBtn, this.settingsBtn, this.clearStrokeBtn]
    for(const but of allButtons) {
      disableFocusForElement(but)
    }

    // shortcuts
    document.addEventListener("keyup", (e) => {
      console.debug("key", e)
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
      }
    });
    document.addEventListener("keydown", (e) => {
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

      if(ctx.activeScreen == MAIN_SCREEN) {
        ctx.draw.renderFrame(dt);
        if(!ctx.sliderChanging && ctx.isPlaying) {
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
  let ctx = new Narrator();
  let err = await ctx.setup(canvas);
  if(err) {
    alert(err)
  }

  await ctx.init();
  ctx.runDrawLoop();
}


await main(null);
