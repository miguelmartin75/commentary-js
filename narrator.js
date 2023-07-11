let t = 0.0;

var vsSource = `#version 300 es

in vec4 a_position;
in vec2 a_texcoord;

uniform mat4 u_matrix;

out vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
}
`;

// Fragment shader program
var fsSource = `#version 300 es
precision mediump float;

in vec2 v_texcoord;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
   outColor = texture(u_texture, v_texcoord);
}
`;

// class Recorder {
//   constructor(startButton) {
//     const stream = await navigator.mediaDevices.getUserMedia({ // <1>
//       video: true,
//       audio: true,
//     })
//     this.currentBlobs = []
// 
//     if (!MediaRecorder.isTypeSupported('video/webm')) { // <2>
//       console.warn('video/webm is not supported')
//     }
// 
//     this.mediaRecorder = new MediaRecorder(stream, { // <3>
//       mimeType: 'video/webm',
//     })
// 
//     this.mediaRecorder.addEventListener('stop', function() {
//       let localVideo = URL.createObjectURL(new Blob(this.currentBlobs, { type: 'video/webm' }))
//       this.currentBlobs = []
//     })
// 
//     mediaRecorder.addEventListener('dataavailable', event => {
//       this.currentBlobs.append(event.data)
//       // videoRecorded.src = URL.createObjectURL(event.data) // <6>
//     })
//   }
// 
//   start() {
//     this.mediaRecorder.start()
//   }
// 
//   stop() {
//     this.mediaRecorder.stop()
//   }
// }

class Video {
  constructor(video, url) {
    this.playing = false;
    this.timeupdate = false;
    this.ready = false;

    this.url = url;
    this.seek_to = null;

    video.playsInline = true;
    video.muted = true; // TODO: configure
    video.loop = false;

    video.addEventListener(
      "playing", () => {
        // console.log("playing");
        this.playing = true;
        this._check_ready();
      },
      true
    );

    video.addEventListener(
      "timeupdate", () => {
        // console.log("tu", this.video.currentTime);
        this.timeupdate = true;
        this._check_ready();
      },
      true
    );

    video.src = url;
    // video.play();

    this.video = video;
  }

  play() {
    this.video.play();
  }

  pause() {
    this.video.pause();
  }

  set_mute() {
    // TODO
  }

  set_volume() {
    // TODO
  }

  is_ready() {
    return this.ready;
  }

  _check_ready() {
    if (this.playing && this.timeupdate) {
      this.ready = true;
      if(this.seek_to) {
        // TODO: seeking does not work
        // console.log("seek");
        // this.seek(this.seek_to);
        // this.seek_to = null;
      }
    }
  }
}

// TODO: rename DrawCtx -> Renderer?
class DrawCtx {
  setup_general() {
    let gl = this.gl;

    // Set clear color to black, fully opaque
    // gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearColor(0.5, 1.0, 1.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  setup_data() {
    // https://webgl2fundamentals.org/webgl/lessons/webgl-2d-drawimage.html
    let gl = this.gl;
    let program = webglUtils.createProgramFromSources(gl, [vsSource, fsSource]);
    this.program = program;

    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    var texcoordAttributeLocation = gl.getAttribLocation(program, "a_texcoord");

    this.matrixLocation = gl.getUniformLocation(program, "u_matrix");
    this.textureLocation = gl.getUniformLocation(program, "u_texture");

    // Create a vertex array object (attribute state)

    var rect_verts = [
      0.0, 0.0,
      0.0, 1.0,
      1.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 1.0,
    ]
    this.rect_verts = rect_verts;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    gl.enableVertexAttribArray(positionAttributeLocation);

    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rect_verts), gl.STATIC_DRAW);

    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    var texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rect_verts), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(texcoordAttributeLocation);
    
    // Tell the attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
    var size = 2;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = true;  // convert from 0-255 to 0.0-1.0
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next color
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
      texcoordAttributeLocation, size, type, normalize, stride, offset);
  }

  constructor() {
    this.videos = [];
    this.textures = [];
    this.drawable_videos = [];
    this.canvas = null;
    // TODO: drawable textures?
  }

  setup(canvas) {
    // const gl = canvas.getContext("webgl2");
    const gl = canvas.getContext("webgl2");
    this.canvas = canvas;
    // Only continue if WebGL is available and working
    if (gl === null) {
      return "Unable to initialize WebGL. Your browser or machine may not support it.";
    }

    this.gl = gl;
    this.setup_general();
    this.setup_data();

    return null;
  }

  draw_video(video, x, y, w, h, keep_aspect) {
    this.drawable_videos.push({video_id: video.id, x: x, y: y, w: w, h: h, keep_aspect: keep_aspect});
  }

  clear_drawables() {
    this.drawable_videos.clear();
  }

  add_create_video(url) {
    const gl = this.gl;

    // TODO multi video container

    const video_id = this.videos.length;
    const video_el = document.createElement("video");
    const video = new Video(video_el, url);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel
    );

    // Turn off mips and set wrapping to clamp to edge so it
    // will work regardless of the dimensions of the video.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.textures.push(texture);
    this.videos.push({texture: texture, video: video});
    
    return {
      container: video,
      id: video_id,
    };
  }

  canvas_width() {
    const dpr = window.devicePixelRatio;
    return this.gl.canvas.clientWidth * dpr;
  }

  canvas_height() {
    const dpr = window.devicePixelRatio;
    return this.gl.canvas.clientHeight * dpr;
  }

  _draw_textured_quad(tex, x, y, width, height, cW, cH) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(this.textureLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // this matrix will convert from pixels to clip space
    // TODO: can we do this in the shader? or cache the mat mul?
    console.log("canvas_width =", cW, cH);
    var matrix = m4.orthographic(0, cW, cH, 0, -1, 1);
    matrix = m4.translate(matrix, x, y, 0);
    matrix = m4.scale(matrix, width, height, 1);
    gl.uniformMatrix4fv(this.matrixLocation, false, matrix);

    var offset = 0;
    // var count = this.rect_verts.length;
    var count = 6; // TODO: above doesn't work?
    gl.drawArrays(gl.TRIANGLES, offset, count);
  }


  render_frame(dt) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    // webglUtils.resizeCanvasToDisplaySize(this.canvas);

    const all_ready = this.drawable_videos.every((x) => this.videos[x.video_id].video.is_ready());
    const cW = this.canvas_width();
    const cH = this.canvas_height();

    if(all_ready) {
      for(const d of this.drawable_videos) {
        const info = this.videos[d.video_id];
        const tex = info.texture;
        const vid = info.video;
        if(vid.is_ready()) {
          const level = 0;
          const internalFormat = gl.RGBA;
          const srcFormat = gl.RGBA;
          const srcType = gl.UNSIGNED_BYTE;
          const frame = vid.video
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat,
            srcType,
            frame
          );

          // draw it
          if(d.keep_aspect) {
            let ar = vid.video.videoWidth / vid.video.videoHeight
            // let vW = Math.min(vid.video.videoWidth, d.w)
            var vW = d.w
            var vH = d.h
            // TODO: check if vH exceeds ch
            let offsetX = 0
            let offsetY = 0
            if(vid.video.videoWidth < vid.video.videoHeight) {
              vH = Math.min(vid.video.videoHeight, cH)
              vW = vH * ar
              // offsetX = cW / 2 + vW / 2
              offsetX = cW / 2 - vW / 2
            } else {
              vW = Math.min(vid.video.videoWidth, cW)
              vH = vW * ar
            }

            this._draw_textured_quad(tex, d.x + offsetX, d.y + offsetY, vW, vH, cW, cH);
          } else {
            this._draw_textured_quad(tex, d.x, d.y, d.w, d.h, cW, cH);
          }
        }
        // seek the video forward by dt
        // const fps = 60; // TODO: get me from mp4
        // const f_dt = ((1.0/dt) / fps) * dt;
        //console.log(f_dt);
        // vid.forward(4 * dt);
      }
    }
    gl.finish();
  }
}

// TODO: move above classes


main(null);

function init(ctx, canvas) {
  // TODO: load from cache?
  const vid = ctx.add_create_video("large.mp4");
  ctx.draw_video(vid, 0, 0, null, null, true);

  let playBtn = document.getElementById("playBtn")
  playBtn.addEventListener("click", function() {
    console.log("play clicked")
    if(playBtn.innerHTML === "Play") {
      vid.container.play()
      playBtn.innerHTML = "Pause"
    } else {
      vid.container.pause()
      playBtn.innerHTML = "Play"
    }
  });
  document.getElementById("nextFrameBtn").addEventListener("click", function() {
    vid.container.currentTime += 1/30.0
  });
  document.getElementById("prevFrameBtn").addEventListener("click", function() {
    vid.container.currentTime -= 1/30.0
  });

  function resize_canvas() {
    const dpr = window.devicePixelRatio;
    const width  = canvas.clientWidth  * dpr;
    const height = canvas.clientHeight * dpr;
   
    // Check if the canvas is not the same size.
    const needResize = canvas.width  != width || 
                       canvas.height != height;
   
    if (needResize) {
      // Make the canvas the same size
      canvas.width  = width;
      canvas.height = height;
    }
   
    return needResize;
  }

  resize_canvas();
  // webglUtils.resizeCanvasToDisplaySize(canvas);

  window.addEventListener("resize", (event) => {
    console.log("resize");
    //resize_canvas();
  });
}

async function main() {
  const canvas = document.querySelector("#glcanvas");
  if(!canvas) {
    console.log("no canvas provided");
    return;
  }

  let ctx = new DrawCtx();
  let err = ctx.setup(canvas);

  if(err) {
    alert(`Unable to setup DrawCtx for rendering:\n${err}`);
    return;
  }

  init(ctx, canvas);
  draw_loop_for_canvas(ctx, canvas);
}

function draw_loop_for_canvas(ctx, canvas) {
  let then = 0;
  function render(now) {
    now *= 0.001; // to seconds
    const dt = now - then;
    then = now;

    // console.log(dt);
    ctx.render_frame(dt);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
