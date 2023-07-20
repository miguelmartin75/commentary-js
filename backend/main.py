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

app_data = load_data()

@app.route("/check_user/<userid>")
def check_user(userid):
    ret = {
        "valid": userid in app_data.users,
        "category": app_data.users.get(userid, None),
    }
    return jsonify(ret)


@app.route("/videos/", methods=["POST"])
def video_stream_path():
    data = json.loads(request.data)
    video_name = data.get("video_name", None)
    print("video_name=", video_name)
    take = app_data.videos_by_name.get(video_name, None)
    https_path = None
    if take is not None:
        print("take=", take)
        s3_path = take["s3_path"]
        https_path = create_presigned_url_from_path(s3_path)
    return jsonify({"path": https_path})


@app.route("/metadata")
def metadata():
    ret = {
        "by_category": {
            task_name: [x["take_name"] for x in xs]
            for task_name, xs in app_data.videos_by_task.items()
        }
    }
    return jsonify(ret)


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
