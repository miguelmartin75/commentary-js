# Setup

To develop the tool, you will need to install node and python/conda. See below for details.

## Node (frontend)
Use nvm to manage node (`nvm use stable`), or use bun instead of npm.
```
npm install
```

## Flask Server

```
conda create -n commentary_js python=3.11 -y
conda activate commentary_js
pip install -r requirement.txt
```

run the server:
```
npm run dev
```

# Code Structure
- `src/commentary.js` contains all the code 
    - `App` class contains the logic for perform commentary
        - `init()` initializes the UI, setups up event listeners & state for it
        - `setup()` creates the recorder and canvas
    - `DrawCtx` contains all the data for drawing
        - `videos` => list of length 1
        - `paths` => a series of paths
        - `renderFrame` => draws a frame in the canvas
    - `Recorder`: keeps track of recordings
    - `Video`: wrapper over a video
- `src/style.css` a post-css file for tailwind-css. The css file is generated
  to `static`

# Dependencies

The following are included in the repository:
- https://github.com/Stuk/jszip/ ([raw file](https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js))

# Past Experiments

* Webgazer was integrated (https://webgazer.cs.brown.edu/), but it's extremely
  noisy and was not included in the production version.

# TODOs

- [ ] infrastructure as code (Terraform)
- [ ] Upload annotation files
- [ ] Use SQLite as DB, see:
    - NOTE: json files currently store metadata which is not ideal
    - https://blog.wesleyac.com/posts/consider-sqlite
	- SQLite replicated on S3, Spaces, GCP, etc: https://litestream.io/
- [ ] Nice to haves
    - [ ] whisper integration, see https://twitter.com/xenovacom/status/1678180605836533762

