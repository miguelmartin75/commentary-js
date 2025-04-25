# Commentary JS

Try it [yourself](commentaryjs.miguel-martin.com) with user id
"kenji" (yes this is referencing the [chef](https://www.youtube.com/@JKenjiLopezAlt)). Use Chrome.

![screenshot](./docs/screenshot.png)

Commentary JS is video annotation tool that enables you to perform audio commentary on top of
videos, optionally with spatial drawings. A variant of this tool was used for
[Ego-Exo4D](https://docs.ego-exo4d-data.org/)'s [Expert
Commentary](https://docs.ego-exo4d-data.org/annotations/expert_commentary/)
annotations.

This is a port of the
[epic-kitchens-100-commentary](https://github.com/epic-kitchens/epic-kitchens-100-commentary)
to JavaScript. 

The tech-stack is simple:
- [Tailwind-CSS](https://tailwindcss.com/) for styling
- JS and HTML for the UI code: ~1.8K LOC
- Python for the backend. Videos must be hosted on S3-compatible storage.

# Additional Contributors

- https://github.com/ChanganVR

## setup

### data

You will need to:
1. Have S3-compatible storage somewhere, e.g. AWS S3, Digitial Ocean Spaces, etc.
2. Generate metadata, see [backend/data.py](./backend/data.py)'s `create_sample_data` function to see what is expected.

### backend

Use nvm to manage node (`nvm use stable`), or use bun instead of npm.
```
npm install
```

server:

```
conda create -n commentary_js python=3.11 -y
conda activate commentary_js
pip install flask boto3 iopath
```

run the server:
```
npm run dev
```

### deployment

There is example Terraform configuration in [./tf](./tf) for Digital Ocean.

# dev docs

## structure
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

## dependencies

The following are included in the repository:
- https://github.com/Stuk/jszip/ ([raw file](https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js))

## Past Experiments

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
