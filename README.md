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

See project: https://github.com/users/miguelmartin75/projects/2

# included deps

- https://github.com/Stuk/jszip/
    - https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js

# code structure

Styling is done with Tailwind-CSS, see docs here: https://tailwindcss.com/

- `src/narrator.js` contains all the code 
    - `Narrator` class contains the logic for the narrator
        - `init()` initializes the UI, setups up event listeners & state for it
        - `setup()` creates the recorder and canvas
            - TODO: 
    - `DrawCtx` contains all the data for drawing
        - `videos` => list of length 1
        - `paths` => a series of paths
        - `renderFrame` => draws a frame in the canvas
- `src/style.css` a post-css file for tailwind-css. The css file is generated to
  `static`

