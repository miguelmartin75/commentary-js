import json
import os

from collections import defaultdict
from flask import (
    Flask,
    send_file,
    request,
    jsonify,
)

from backend.presign_utilities import create_presigned_url_from_path
from backend.egoexo import load_data

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
app = Flask(
    __name__,
    static_folder=os.path.join(REPO_DIR, "static"),
)
# app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

VALID_ACCESS_KEYS = {"temp"}

data = load_data()


@app.route("/videos/", methods=["POST"])
def video_stream_path():
    data = json.loads(request.data)
    print("data=", data)
    cat = data.get("category", None)
    video = data.get("video", None)
    print("cat=", cat, "video_id=", video)
    s3_path = "s3://ego4d-cmu/egoexo/releases/dev/takes/cmu_soccer06_2/ego_preview.mp4"
    https_path = create_presigned_url_from_path(s3_path)
    return jsonify({"path": https_path})


@app.route("/narrator.js")
def main_src():
    return send_file(os.path.join(REPO_DIR, "src/narrator.js"))


# @cross_origin()
# @compress.compressed()
@app.route("/", defaults={"id": None})
@app.route("/<id>")
def index(id):
    return send_file(os.path.join(REPO_DIR, "src/index.html"))


if __name__ == "__main__":
    app.run()
