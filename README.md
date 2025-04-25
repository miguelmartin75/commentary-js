# Commentary JS

Try it [yourself](commentaryjs.miguel-martin.com) with user id
"kenji" (yes this is referencing the [Chef](https://www.youtube.com/@JKenjiLopezAlt)). Use Chrome.

![screenshot](./docs/screenshot.jpg)

Commentary JS is video annotation tool that enables you to perform audio
commentary on top of videos, optionally with spatial drawings and video
recording. A variant of this tool was used for
[Ego-Exo4D](https://docs.ego-exo4d-data.org/)'s [Expert
Commentary](https://docs.ego-exo4d-data.org/annotations/expert_commentary/)
annotations.

This is a port of the
[epic-kitchens-100-narrator](https://github.com/epic-kitchens/epic-kitchens-100-narrator)
to JavaScript. 

The tech-stack is simple:
- [Tailwind-CSS](https://tailwindcss.com/) for styling
- JS and HTML for the UI code: ~1.8K LOC
- Python for the backend. Videos must be hosted on S3-compatible storage.

# Additional Contributors

- https://github.com/ChanganVR

# Setup

Follow the below steps:

## 1. Data

Steps:
1. Have S3-compatible storage somewhere, e.g. AWS S3, Digitial Ocean Spaces, etc.
2. Configure your environment, see [backend/constants.py](./backend/constants.py) for what's required.
3. Generate metadata, see [backend/data.py](./backend/data.py)'s `create_sample_data` function to see what is expected.
    - The
      [`scripts/upload_sample_videos.sh`](./scripts/upload_sample_videos.sh) is
      a script to example video data onto DigitalOcean spaces.
    - You can run `python backend/data.py` to generate sample metadata on your S3 storage.


## 2. Deploy

There is example Terraform configuration in [./tf](./tf) for Digital Ocean. 

You will need:
1. An S3-compatible storage (as mentioned above)
2. A VM with the correct environment installed. You can use the example
   [Dockerfile](./Dockerfile) for setting up the environment.

# Dev Docs

See [docs/dev.md](./docs/dev.md) for setup
