"use strict";

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
      let curr = {url: url, idx: this.recordings.length, blob: blob}
      this.recordings.push(curr)
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
    this.mediaRecorder.start()
  }

  stop() {
    this.mediaRecorder.stop()
  }
}

class Video {
  constructor(video, url, seek_to) {
    this.playing = false;
    this.timeupdate = false;
    this.ready = false;
    this.url = url;
    video.playsInline = true;
    video.muted = true; // TODO: configure
    video.loop = false;
    this.seek_to = seek_to;


    video.addEventListener(
      "playing", () => {
        this.playing = true;
        if(!this.ready) {
          this.ready = true;
          this.pause();
          if(this.seek_to) {
            this.video.currentTime = this.seek_to;
          }
        }
      },
      true
    );

    // TODO: investigate performance using "timeupdate"
    video.src = url;
    this.video = video;

    video.play(); // plays video to run init
  }

  play() {
    this.video.play();
  }

  pause() {
    this.video.pause();
  }

  is_ready() {
    return this.ready;
  }
}

function resize_canvas(canvas) {
  webglUtils.resizeCanvasToDisplaySize(canvas);
}

// TODO: rename DrawCtx -> Renderer?
class DrawCtx {
  constructor() {
    this.videos = [];
    this.textures = [];
    this.drawable_videos = [];
    this.paths = []
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
      resize_canvas(this.canvas);
    });


    // TODO: configure or dynamic
    this.gl.lineWidth = 5;
    this.gl.lineCap = 'round';
    this.gl.strokeStyle = '#c0392b';
    return null;
  }

  draw_video(video, x, y, w, h, keep_aspect) {
    this.drawable_videos.push({video_id: video.id, x: x, y: y, w: w, h: h, keep_aspect: keep_aspect});
  }

  add_path(path) {
    this.paths.push(path)
  }

  clear_paths() {
    this.paths = []
  }

  add_create_video(url) {
    // TODO multi video container
    const video_id = this.videos.length;
    const video_el = document.createElement("video");
    const video = new Video(video_el, url);

    this.videos.push({video: video});
    return {
      container: video,
      id: video_id,
    };
  }

  canvas_width() {
    return this.canvas.clientWidth;
  }

  canvas_height() {
    return this.canvas.clientHeight;
  }


  render_frame(dt) {
    const cW = this.canvas_width();
    const cH = this.canvas_height();

    this.gl.clearRect(0, 0, cW, cH);
    for(const d of this.drawable_videos) {
      const info = this.videos[d.video_id];
      const vid = info.video;
      if(vid.is_ready()) {
        const frame = vid.video
        let ar = vid.video.videoWidth / vid.video.videoHeight
        let vW = d.w
        let vH = d.h
        let offsetX = 0
        let offsetY = 0
        vH = Math.min(vid.video.videoHeight, cH)
        vW = vH * ar
        offsetX = cW / 2 - vW / 2
        this.gl.drawImage(
          frame,
          d.x + offsetX,
          d.y + offsetY,
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

  async setup(canvas) {
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

    console.log("Setup with", micDevice, videoDevice)
    const stream = await navigator.mediaDevices.getUserMedia({ // <1>
      // video: true,
      // audio: true,
      video: {deviceId: videoDevice},
      audio: {deviceId: micDevice},
    })

    this.canvas = canvas;
    this.draw = new DrawCtx();
    this.draw.setup(canvas);
    if(err) {
      return err;
    }

    this.recorder = new Recorder()
    err = this.recorder.setup(stream, this._audioCreated)
    if(err) {
      return err
    }
    this.audioCreatedCb = null
  }

  _audioCreated(src) {
    if(this.audioCreatedCb) {
      console.log("audio created with callback")
      this.audioCreatedCb(src)
    } else {
      console.log("audio created without callback")
    }
  }

  reset_draw_canvas() {
    let ctx = this
    ctx.pos = {x: undefined, y: undefined}
    ctx.draw.clear_paths()
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

    this.canvas.addEventListener('mousemove', add_path);
    this.canvas.addEventListener('mouseup', clear_draw_pos);
    this.canvas.addEventListener('mousedown', set_draw_pos);
    this.canvas.addEventListener('mouseenter', set_draw_pos);
    document.getElementById("clearStrokeBtn").addEventListener("click", () => {
      this.reset_draw_canvas()
    });
  }

  update_timeline() {
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

    // player state
    this.isPlaying = false
    this.playDisabled = false
    this.wasPlaying = false

    // recorder state
    this.recordDisabled = false
    this.recordTime = null
    this.isRecording = false

    // annotation
    this.submitting = false

    // canvas
    this.viewVideo = this.draw.add_create_video(VIDEO_PATH);
    let vid = this.viewVideo
    this.draw.draw_video(this.viewVideo, 0, 0, null, null, true);
    this.init_draw_canvas()

    // simple state machine for slider, ref https://stackoverflow.com/a/61568207
    this.playBar.min = 0
    this.playBar.value = 0
    this.playBar.max = undefined
    vid.container.video.onloadedmetadata = () => {
      this.playBar.max = this.duration;
    };
    this.sliderChanging = false;
    this.playBar.addEventListener("mousedown", () => {
      this.sliderChanging = true;
    });
    this.playBar.addEventListener("mouseup", () => {
      this.sliderChanging = false;
      vid.container.video.currentTime = this.playBar.value;
      this.update_timeline()
    });
    this.playBar.addEventListener("mousemove", () => {
      if(this.sliderChanging) {
        vid.container.video.currentTime = this.playBar.value;
        this.update_timeline()
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
      if(this.recordDisabled) {
        return;
      }
      if(!this.isRecording) {
        if(this.isPlaying) {
          togglePlay()
          this.wasPlaying = true
        } else {
          this.wasPlaying = false
        }

        this.recorder.start()
        this.isRecording = true
        this.playDisabled = true
        this.recordTime = vid.container.video.currentTime
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
          togglePlay()
          this.wasPlaying = false
        }
      }
    }
    this.togglePlay = () => {
      console.log(this.playDisabled)
      if(this.playDisabled) {
        return;
      }
      if(!this.isPlaying) {
        vid.container.play()
        this.isPlaying = true
        this.playBtn.innerHTML = "Pause"
      } else {
        vid.container.pause()
        this.isPlaying = false
        this.playBtn.innerHTML = "Play"
      }
    }
    this.nextFrame = () => {
      vid.container.video.currentTime += 1/30.0
      this.update_timeline()
    }
    this.prevFrame = () => {
      vid.container.video.currentTime -= 1/30.0
      this.update_timeline()
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
        audioList.appendChild(node);

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
        x.data = {
          time: this.recordTime,
          // TODO: add timing information
          // paths: {...this.draw.paths},
          paths: [...this.draw.paths],
        }
        this.recordTime = null
        this.recordDisabled = false
    }
    this.recorder.audioCreatedCb = (x) => {
      this.endRecording(x)
    }
    this.deleteRecording = (idx) => {
      this.recorder.remove(idx)
    }
    // TODO: add delete
    this.playBtn.addEventListener("click", this.togglePlay)
    this.nextFrameBtn.addEventListener("click", this.nextFrame);
    this.prevFrameBtn.getElementById("prevFrameBtn").addEventListener("click", this.prevFrame);
    this.recordBtn.addEventListener("click", toggleRecord)
    this.submitBtn.addEventListener("click", this.submitAnn)
    this.rejectBtn.addEventListener("click", this.rejectAnn)

    // shortcuts
    document.addEventListener("keyup", (e) => {
      console.debug("key", e)
      if(e.key == " ") {
        togglePlay()
      } else if (e.key == "Enter") {
        toggleRecord()
      } 
    });
    document.addEventListener("keydown", (e) => {
      if (e.key == "n" || e.key == "ArrowRight") {
        nextFrame()
      } else if (e.key == "p" || e.key == "ArrowLeft") {
        nextFrame()
      }
    });

  }

  run_draw_loop() {
    let then = 0;
    let ctx = this
    function render(now) {
      now *= 0.001; // to seconds
      const dt = now - then;
      then = now;

      ctx.draw.render_frame(dt);
      if(!ctx.sliderChanging && ctx.isPlaying) {
        ctx.update_timeline()
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
  ctx.run_draw_loop();
}


await main(null);
