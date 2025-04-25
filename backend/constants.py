import os

AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")

# NOTE: defaults to DigitalOcean
S3_ENDPOINT_URL = os.environ.get("COMMENTARYJS_S3_ENDPOINT_URL", "https://sfo2.digitaloceanspaces.com")
S3_REGION_NAME = os.environ.get("COMMENTARYJS_S3_REGION", "sfo2")

S3_BUCKET = os.environ.get("COMMENTARYJS_S3_BUCKET", "mm-dev")
BUCKET_S3_ROOT_DIR = os.environ.get("COMMENTARYJS_S3_ROOT_DIR", "commentary-js")
VIDEO_ROOT_KEY = os.environ.get("COMMENTARYJS_VIDEO_ROOT_KEY", f"{BUCKET_S3_ROOT_DIR}/videos")
assert VIDEO_ROOT_KEY.startswith(BUCKET_S3_ROOT_DIR)

VIDEO_METADATA_KEY = os.environ.get("COMMENTARYJS_VIDEO_METADATA_KEY", f"{BUCKET_S3_ROOT_DIR}/videos/latest.json")
assert VIDEO_METADATA_KEY.startswith(BUCKET_S3_ROOT_DIR)

USERS_KEY = os.environ.get("COMMENTARYJS_USER_KEY", f"{BUCKET_S3_ROOT_DIR}/users/latest.json")
assert USERS_KEY.startswith(BUCKET_S3_ROOT_DIR)

BATCHES_KEY = os.environ.get("COMMENTARYJS_BATCHES_KEY", f"{BUCKET_S3_ROOT_DIR}/batches/latest.json")
assert BATCHES_KEY.startswith(BUCKET_S3_ROOT_DIR)

BATCHES_PREV_KEY = os.environ.get("COMMENTARYJS_BATCHES_PREV_KEY", f"{BUCKET_S3_ROOT_DIR}/batches/prev.json")
assert BATCHES_PREV_KEY.startswith(BUCKET_S3_ROOT_DIR)

ADD_TEST_USERS = os.environ.get("COMMENTARYJS_ADD_TEST_USERS", "False").lower() in ("0", "false")

S3_BUCKET_PREFIX = f"s3://{S3_BUCKET}"
S3_ROOT_DIR = os.path.join(f"s3://{S3_BUCKET}", BUCKET_S3_ROOT_DIR)
S3_VIDEO_DIR = os.path.join(S3_BUCKET_PREFIX, VIDEO_ROOT_KEY)
# S3_VIDEO_METADATA_PATH = os.path.join(S3_PREFIX, VIDEO_METADATA_KEY)
# S3_USERS_PATH = os.path.join(S3_PREFIX, USERS_KEY)
# S3_BATCHES_PATH = os.path.join(S3_PREFIX, BATCHES_KEY)
# S3_BATCHES_PREV_PATH = os.path.join(S3_PREFIX, BATCHES_PREV_KEY)

assert AWS_ACCESS_KEY != "", "Provide AWS_ACCESS_KEY"
assert AWS_SECRET_ACCESS_KEY != "", "Provide AWS_SECRET_ACCESS_KEY"
