import time
import json
import os

from collections import defaultdict
from flask_cors import CORS, cross_origin
from flask import (
    Flask,
    send_file,
    request,
    jsonify,
)

from backend.s3 import create_presigned_url_from_path
from backend.data import load_data

S3_EXPIRATION_SEC = 28800
CACHE_SEC_THRESHOLD = S3_EXPIRATION_SEC // 2
REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
app = Flask(
    __name__,
    static_folder=os.path.join(REPO_DIR, "static"),
)
cors = CORS(app)#, resources={r"/*": {"origins": "*"}})

app_data = load_data()
video_stream_cache = {}

@app.route("/videos/<userid>")
@cross_origin()
def videos(userid):
    print("/videos", userid)
    user_cat = app_data.users.get(userid, None)
    ret = {
        "valid": userid in app_data.users,
        "category": user_cat,
        "videos_by_category": {
            task_name: [
                {
                    "name": x["name"],
                    "task": x["task"],
                    "batch": app_data.batches.get(x["name"], "None"),
                    "in_annotated_batch": (
                        x["name"] in app_data.old_batches_by_prev_count.get(2, [])
                    ),
                    "in_annotating_batch": (
                        x["name"] in app_data.old_batches_by_prev_count.get(1, [])
                    ),
                }
                for x in xs
            ]
            for task_name, xs in app_data.videos_by_task.items()
            if task_name == user_cat
        }
    }
    return jsonify(ret)


@app.route("/videos/", methods=["POST"])
@cross_origin()
def video_stream_path():
    data = json.loads(request.data)
    userid = data.get("userid", None)
    if userid is None or userid not in app_data.users:
        https_path = None
        return jsonify({"path": https_path})
    else:
        video_name = data.get("video_name", None)
        key = (userid, video_name)
        t_now = time.time()
        if key in video_stream_cache:
            t_delta = t_now - video_stream_cache[key]["time"]
            if abs(t_delta) < CACHE_SEC_THRESHOLD:
                return video_stream_cache[key]["result"]
            

        v = app_data.videos_by_name.get(video_name, None)
        https_path = None
        if v is not None:
            s3_path = v["s3_path"]
            https_path = create_presigned_url_from_path(s3_path, expiration=S3_EXPIRATION_SEC)
        result = jsonify({"path": https_path})
        video_stream_cache[key] = {
            "result": result,
            "time": t_now,
        }
        return result



@app.route("/commentary.js")
@cross_origin()
def main_src():
    return send_file(os.path.join(REPO_DIR, "src/commentary.js"))


@app.route("/", defaults={"id": None})
@app.route("/<id>")
@cross_origin()
def index(id):
    return send_file(os.path.join(REPO_DIR, "src/index.html"))


if __name__ == "__main__":
    app.run()
