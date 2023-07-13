"use strict";

const MAIN_SCREEN = 1
const SETTINGS_SCREEN = 2
const SHORTCUTS_SCREEN = 3
const START_SCREEN = MAIN_SCREEN

const VIDEO_PATH = "static/cmu_soccer06_2.mp4"
const RECORDING_EXT = "webm"
const RECORDING_TYPE = `video/${RECORDING_EXT}`
const DELETE_BUTTON_CLASSES = "m-1 px-4 py-1 text-sm text-white-600 font-semibold rounded-full border border-white-600 hover:text-black hover:bg-black-600 hover:border-black-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
const REPLAY_ANN_BUTTON_CLASSES = "m-1 px-4 py-1 text-sm text-white-600 font-semibold rounded-full border border-white-600 hover:text-black hover:bg-black-600 hover:border-black-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
const FPS = 30; // TODO: use mp4jsbox to get frame rate?

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
  setup(stream, newRecordingCb) {
    if(!stream) {
      return "no stream given"
    }
    this.currentBlobs = []
    this.recordings = []
    this.currentId = 0

    if (!MediaRecorder.isTypeSupported(RECORDING_TYPE)) { // <2>
      console.warn(`${RECORDING_TYPE} is not supported`)
    }
    this.mediaRecorder = new MediaRecorder(stream, { // <3>
      mimeType: RECORDING_TYPE
    })

    this.newRecordingCb = newRecordingCb 
    this.mediaRecorder.addEventListener('stop', () => {
      let blob = new Blob(this.currentBlobs, { type: RECORDING_TYPE })
      let url = URL.createObjectURL(blob)
      let curr = {url: url, blob: blob}
      this.recordings.unshift(curr)
      this.currentBlobs = []
      console.log(this.newRecordingCb)
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
  constructor(video, url, on_play_fail, seek_to) {
    // TODO: investigate performance using "timeupdate"
    this.playing = false;
    this.timeupdate = false;
    this.ready = false;
    this.url = url;
    this.seek_to = seek_to;
    this.on_play_fail = on_play_fail

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

function resize_canvas(canvas) {
  //webglUtils.resizeCanvasToDisplaySize(canvas);
  // let multiplier = window.devicePixelRatio
  let multiplier = 1
  multiplier = multiplier || 1;
  const width  = canvas.clientWidth  * multiplier | 0;
  const height = canvas.clientHeight * multiplier | 0;
  if (canvas.width !== width ||  canvas.height !== height) {
    canvas.width  = width;
    canvas.height = height;
    return true;
  }
  return false;
}

// TODO: rename DrawCtx -> Renderer?
class DrawCtx {
  constructor() {
    this.paths = []
    this.videos = []
    this.canvas = null;
    // TODO: drawable textures?
  }

  setup(canvas) {
    const gl = canvas.getContext("2d");
    this.canvas = canvas;
    if (gl === null) {
      return "Unable to initialize canvas. Your browser or machine may not support it.";
    }

    this.gl = gl;
    resize_canvas(this.canvas);
    window.addEventListener("resize", (event) => {
      if(this.videos.length == 1) {
        resize_canvas(this.canvas);
      }
    });


    // TODO: configure or dynamic
    this.gl.lineWidth = 5;
    this.gl.lineCap = 'round';
    this.gl.strokeStyle = '#c0392b';
    return null;
  }

  add_path(path) {
    this.paths.push(path)
  }

  clear_paths() {
    this.paths = []
  }

  add_create_video(url, on_play_fail, seek_to) {
    const video_id = this.videos.length;
    const video_el = document.createElement("video");
    const video = new Video(video_el, url, on_play_fail, seek_to);

    let ret = {
      container: video,
      draw_data: {
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

  remove_videos() {
    this.videos = []
  }

  canvas_width() {
    return this.canvas.clientWidth;
  }

  canvas_height() {
    return this.canvas.clientHeight;
  }

  renderFrame(dt) {
    const cW = this.canvas_width();
    const cH = this.canvas_height();

    this.gl.clearRect(0, 0, cW, cH);
    for(const {container, draw_data} of this.videos) {
      // TODO: use draw_data
      if(container.is_ready()) {
        const frame = container.video
        let ar = container.video.videoWidth / container.video.videoHeight
        let vH = Math.min(container.video.videoHeight, cH)
        let vW = vH * ar
        let offsetX = 0
        let offsetY = 0
        offsetX = cW / 2 - vW / 2
        this.gl.drawImage(
          frame,
          offsetX,
          offsetY,
          vW,
          vH
        );
      }
    }
    for(const path of this.paths) {
      this.gl.beginPath();
      this.gl.moveTo(path.from.x, path.from.y)
      this.gl.lineTo(path.to.x, path.to.y)
      this.gl.stroke(); // draw it!
    }
  }
}

class Narrator {

  async createRecorder() {
    let err = null 

    // TODO: create a setup screen
    // TODO https://github.com/samdutton/simpl/blob/gh-pages/getusermedia/sources/js/main.js
    const devices = await navigator.mediaDevices.enumerateDevices()
    let micDevice = null
    let videoDevice = null
    for (var dev of devices) {
      if(dev.label.includes("MacBook Pro Microphone")) {
        micDevice = dev.deviceId
      } else if(dev.label.includes("FaceTime HD Camera")) {
        videoDevice = dev.deviceId
      }
    }
    const stream = await navigator.mediaDevices.getUserMedia({ // <1>
      // video: true,
      // audio: true,
      video: {deviceId: videoDevice},
      audio: {deviceId: micDevice},
    })
    this.recorder = new Recorder()
    err = this.recorder.setup(stream, this._recordingCreated)
    if(err) {
      return err
    }
    return err
  }

  openVideo(url) {
    this.draw.remove_videos()
    this.viewVideo = this.draw.add_create_video(url, () => {
      this.pause()
    });
    this.init_draw_canvas()
    this.viewVideo.container.video.onloadedmetadata = () => {
      this.playBar.max = this.duration;
    };
  }

  async setup(canvas) {
    // TODO: micDevice, videoDevice
    let err = await this.createRecorder()
    if(err) return err;

    this.canvas = canvas;
    this.draw = new DrawCtx();
    this.draw.setup(canvas);
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

  reset_draw_canvas() {
    this.pos = {x: undefined, y: undefined}
    this.draw.clear_paths()
  }

  init_draw_canvas() {
    // modified from https://stackoverflow.com/a/30684711
    let ctx = this
    this.reset_draw_canvas()
    function set_draw_pos(e) {
      const target = e.target;
      const rect = target.getBoundingClientRect();

      ctx.pos.x = e.clientX - rect.left;
      ctx.pos.y = e.clientY - rect.top;
    }
    function clear_draw_pos(e) {
      ctx.pos = {x: undefined, y: undefined}
    }
    function add_path(e) {
      // mouse left button must be pressed
      if (e.buttons !== 1) return;

      const from = {x: ctx.pos.x, y: ctx.pos.y}
      set_draw_pos(e)
      if(!from.x || !from.y) return;
      const to = {x: ctx.pos.x, y: ctx.pos.y}
      const path = {from: from, to: to}
      ctx.draw.add_path(path)
    }

    this.canvas.addEventListener("mousemove", add_path);
    this.canvas.addEventListener("mouseup", clear_draw_pos);
    this.canvas.addEventListener("mousedown", set_draw_pos);
    this.canvas.addEventListener("mouseenter", set_draw_pos);
    // TODO: when recording save the time when cleared
    this.clearStrokeBtn.addEventListener("click", () => { this.reset_draw_canvas() });
  }

  updateTimeline() {
      this.playBar.value = this.viewVideo.container.video.currentTime
      this.timeInfo.innerHTML = `${this.viewVideo.container.video.currentTime}`
      this.frameInfo.innerHTML = `${Math.floor(this.viewVideo.container.video.currentTime * FPS)}`
  }

  init() {
    // ui elements
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
    this.activeScreen = MAIN_SCREEN

    // player state
    this.isPlaying = false
    this.playDisabled = false
    this.wasPlaying = false

    // recorder state
    this.recordDisabled = false
    this.recordTime = null
    this.isRecording = false

    // annotation submit/reject state
    this.submitting = false

    // simple state machine for slider, ref https://stackoverflow.com/a/61568207
    this.playBar.min = 0
    this.playBar.value = 0
    this.playBar.max = undefined
    this.sliderChanging = false;
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

    this.submitAnn = () => {
      // TODO: animation
      if(this.submitting) {
        return;
      }
      var zip = new JSZip();
      var vids = zip.folder("videos");
      let data = []
      for(const idx in this.recorder.recordings) {
        const recording = this.recorder.recordings[idx]
        const path = `${idx}.${RECORDING_EXT}`
        vids.file(path, recording.blob, {type: "blob"})
        data.push({...recording.data, "video": path})
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
        this.playDisabled = true
        this.recordTime = this.viewVideo.container.video.currentTime
        this.recordBtn.innerHTML = "Stop Recording"
      } else {
        this.recorder.stop()
        // TODO: set style disabled
        this.isRecording = false
        this.recordDisabled = true
        this.recordBtn.innerHTML = "Record"
        this.reset_draw_canvas()
        // TODO: add option?
        this.playDisabled = false
        if(this.wasPlaying) {
          this.play()
          this.wasPlaying = false
        }
      }
    }
    this.pause = () => {
      if(!this.viewVideo) return;
      this.viewVideo.container.pause()
      this.isPlaying = false
      this.playBtn.innerHTML = "Play"
    }
    this.play = () => {
      if(this.playDisabled || !this.viewVideo) {
        return;
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
      this.updateTimeline()
    }
    this.prevFrame = () => {
      this.viewVideo.container.video.currentTime -= 1/30.0
      this.updateTimeline()
    }
    this.endRecording = (x) => {
        // NOTE: actually video
        // TODO: log the data here including paths
        let src = x.url
        let node = document.createElement("li")
        node.innerHTML = `Time: ${this.recordTime} `

        let audioNode = document.createElement("video")
        audioNode.src = src
        audioNode.setAttribute("controls", "controls")

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
        node.appendChild(delButton)
        node.appendChild(replayButton)
        node.appendChild(audioNode)

        audioList.prepend(node);
        x.data = {
          time: this.recordTime,
          // TODO: add timing information
          // paths: {...this.draw.paths},
          // NOTE(miguelmartin): is there a better way to deep copy?
          paths: JSON.parse(JSON.stringify(this.draw.paths)),
        }
        this.recordTime = null
        this.recordDisabled = false
    }
    this.recorder.recordingCreatedCb = (x) => {
      this.endRecording(x)
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
      console.log("active=", this.activeScreen, "prev=", this.prevScreen)
      const a = this.getScreen(this.activeScreen)
      const b = this.getScreen(this.prevScreen)
      show(a)
      hide(b)
    }
    this.showPrevScreen = () => {
      console.log("showing previous screen", this.prevScreen, "curr=", this.activeScreen)
      this.setScreen(this.prevScreen)
    }
    this.toggleScreen = (screen_id) => {
      console.log("activeScreen=", this.activeScreen, screen_id)
      if(this.activeScreen !== screen_id) {
        console.log("setting", screen_id, this.activeScreen, this.activeScreen === screen_id)
        this.setScreen(screen_id)
      } else {
        this.showPrevScreen()
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

    // shortcuts
    document.addEventListener("keyup", (e) => {
      console.debug("key", e)
      if(e.key === " ") {
        this.togglePlay()
      } else if (e.key === "Enter") {
        this.toggleRecord()
      } else if(e.key === "?") {
        this.showPrevScreen()
      } else if(e.key === "Escape") {
        this.toggleScreen(SETTINGS_SCREEN)
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "." || e.key === "ArrowRight") {
        this.nextFrame()
      } else if (e.key === "," || e.key === "ArrowLeft") {
        this.nextFrame()
      } else if(e.key === "?") {
        this.setScreen(SHORTCUTS_SCREEN)
      }
    });

    this.openVideo(VIDEO_PATH)
  }

  runDrawLoop() {
    let then = 0;
    let ctx = this
    function render(now) {
      now *= 0.001; // to seconds
      const dt = now - then;
      then = now;

      ctx.draw.renderFrame(dt);
      if(!ctx.sliderChanging && ctx.isPlaying) {
        ctx.updateTimeline()
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

  ctx.init();
  ctx.runDrawLoop();
}


await main(null);
