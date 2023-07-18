import json
import os
from flask import (
    Flask,
    send_file,
    request,
    jsonify,
)
import boto3

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
app = Flask(
    __name__,
    static_folder=os.path.join(REPO_DIR, "static"),
)
# app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

VALID_ACCESS_KEYS = {"temp"}

data = json.load(open("ec_metadata.json"))

def generate_presigned_url(s3_path):
    data = request.get_json()

    s3_path = data.get('s3_path', None)
    access_key = data.get('access_key', None)

    if not all([s3_path, access_key]):
        return jsonify({'error': 'Missing data!'}), 400

    if access_key not in VALID_ACCESS_KEYS:
        return jsonify({'error': 'Invalid access key!'}), 403

    s3_bucket, s3_key = s3_path.split('/', 1)

    try:
        s3_client = boto3.client('s3')
        response = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": s3_bucket, "Key": s3_key},
            ExpiresIn=3600,
        )
    except NoCredentialsError:
        return jsonify({'error': 'No AWS credentials found!'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'presigned_url': response}), 200

@app.route("/videos/<id>")
def get_video_stream_path(id):
    print(id)
    return jsonify({"path": "todo"})


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
