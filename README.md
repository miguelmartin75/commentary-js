# narrator_js

A port of the
[epic-kitchens-100-narrator](https://github.com/epic-kitchens/epic-kitchens-100-narrator)
to JavaScript.

## setup

```
npm install
```

server:

```
conda create -n narrator_js python=3.11 -y
conda activate narrator_js
pip install flask
```

## run

Please setup server beforehand.

```
npm run dev
```

# TODOs

- [ ] frontend
    - (1) [ ] input: open local video file
    - (2) [ ] delete annotation
    - (3) [ ] paths: normalized from 0-1
    - (4) [ ] settings screen: selection of video/audio device
    - (5) [ ] cookies / save progress (maybe on backend too?)
        - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
    - [ ] annotation view
        - [ ] seek to time
        - [ ] replay (to remove)
    - [ ] next or previous annotation job
    - [ ] input data
        - [ ] local directory or series of files
        - [ ] from server
    - [ ] output data
        - [x] zip video files
        - [x] timestamps
        - [ ] paths
        - [ ] upload
        - [ ] save (or upload) progress bar
    - [ ] "open" screen
        - [ ] connect to backend
        - [ ] select which video
    - [ ] paths: timing information
    - [ ] optimizations of UI
    - [ ] error messages
    - [ ] log errors to server
    - [x] scroll only sidebar
    - [x] shortcuts popup
- [ ] backend
    - [ ] generate https S3 path
    - [ ] authenticate
        - [ ] username/unixname
        - [ ] auth key for S3
    - [ ] get takes for scenario

## To investigate
- https://webgazer.cs.brown.edu/ 
- https://twitter.com/xenovacom/status/1678180605836533762

(predicted) TODOs here
- [ ] gaze 
    - [ ] integrate JS tool
    - [ ] calibration page

# included deps

- https://github.com/eligrey/FileSaver.js/tree/master
    - https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js
- https://github.com/Stuk/jszip/
    - https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js

# code structure

Styling is done with Tailwind-CSS, see docs here: https://tailwindcss.com/

- `static/narrator.js` contains all the code 
    - `Narrator` class contains the logic for the narrator
        - `init()` initializes the UI, setups up event listeners & state for it
        - `setup()` creates the recorder and canvas
            - TODO: 
    - `DrawCtx` contains all the data for drawing
        - `videos` => list of length 1
        - `paths` => a series of paths
        - `renderFrame` => draws a frame in the canvas
- `static/style.css` a post-css file for tailwind-css

