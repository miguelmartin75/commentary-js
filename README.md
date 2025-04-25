# narrator_js

A port of the
[epic-kitchens-100-narrator](https://github.com/epic-kitchens/epic-kitchens-100-narrator)
to JavaScript. Try it [yourself]() with user id "kenji".

TODO: screenshot

The tech-stack is simple:
- [Tailwind-CSS](https://tailwindcss.com/) for styling
- JS and HTML for the UI code: ~1.8K LOC
- Python for the backend. Videos can be hosted on S3 or elsewhere.

## setup

### data

TODO

### hosting

Use nvm to manage node (`nvm use stable`), or use bun instead of npm.
```
npm install
```

server:

```
conda create -n narrator_js python=3.11 -y
conda activate narrator_js
pip install flask boto3 iopath
```

run the server:
```
npm run dev
```

# dev docs

## structure
- `src/narrator.js` contains all the code 
    - `Narrator` class contains the logic for the narrator
        - `init()` initializes the UI, setups up event listeners & state for it
        - `setup()` creates the recorder and canvas
    - `DrawCtx` contains all the data for drawing
        - `videos` => list of length 1
        - `paths` => a series of paths
        - `renderFrame` => draws a frame in the canvas
- `src/style.css` a post-css file for tailwind-css. The css file is generated
  to `static`

## dependencies

The following are included in the repository:
- https://github.com/Stuk/jszip/ ([raw file](https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.min.js))

## TODOs

- [ ] infrastructure as code (Terraform)
- [ ] Upload annotation files
- [ ] Frontend CORS S3 issue
- [ ] Use SQLite as DB, see:
    - NOTE: json files currently store metadata which is not ideal
    - https://blog.wesleyac.com/posts/consider-sqlite
	- SQLite replicated on S3, Spaces, GCP, etc: https://litestream.io/
- [ ] Nice to haves
    - [ ] whisper integration, see https://twitter.com/xenovacom/status/1678180605836533762

## Past Experiments

* Webgazer was integrated (https://webgazer.cs.brown.edu/), but it's extremely
  noisy and was not included in the production version.
