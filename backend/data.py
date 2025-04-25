import os
import json
from typing import Dict, Any, List
from collections import defaultdict
from dataclasses import dataclass

from backend.s3 import (
    create_client,
    read_file,
    put_file,
)
from backend.constants import (
    ADD_TEST_USERS,
    S3_VIDEO_DIR,
    # S3_VIDEO_METADATA_PATH,
    # S3_BATCHES_PATH,
    USERS_KEY,
    VIDEO_METADATA_KEY,
    BATCHES_KEY,
    S3_BUCKET,
)


@dataclass
class DataToAnnotate:
    users: Dict[str, str]
    batches: Dict[str, List[str]]
    old_batches_by_prev_count: Dict[int, Dict[str, str]]
    videos_by_name: Dict[str, Dict[str, Any]]
    videos_by_task: Dict[str, List[Dict[str, Any]]]



def load_data():
    _, client = create_client()

    users = json.load(read_file(client, USERS_KEY))
    data = json.load(read_file(client, VIDEO_METADATA_KEY))
    batches = json.load(read_file(client, BATCHES_KEY))

    old_batches_by_prev_count = {}
    # TODO
    # for k, v in OLD_BATCHES.items():
    #     ob = json.load(pathmgr.open(v))
    #     old_batches_by_prev_count[k] = {
    #         v: k for k, temp in ob.items() 
    #         for _, vs in temp.items()
    #         for v in vs
    #     }
        

    print(f"Loaded: {len(data)} videos")
    by_task = defaultdict(list)
    by_name = {}
    for x in data:
        if x["s3_path"] is None:
            print(f"Skipping: {x}")
            continue

        name = x["name"]
        task_cat = x["task"]

        by_task[task_cat].append(x)
        assert name not in by_name
        by_name[name] = x

    num_v = sum(len(vs) for vs in batches.values())
    batches_by_video_name = {
        v: k
        for k, vs in batches.items() 
        for v in vs
    }

    # NOTE: assumes each batch contains a unique video name
    assert num_v == len(batches_by_video_name)

    if ADD_TEST_USERS:
        for task in by_task.keys():
            user_id = task.split(" ")[0].lower() + "_test"
            users[user_id] = task

    return DataToAnnotate(
        users=users,
        batches=batches_by_video_name,
        old_batches_by_prev_count=old_batches_by_prev_count,
        videos_by_name=by_name,
        videos_by_task=by_task,
    )

def create_sample_data():
    # <user-name> -> <task>
    users = {
        "kenji": "Cooking",
    }
    # list of videos, see scripts/upload_video_sample
    videos = [
        {
            "name": "Garlic Noodles - SF Style",
            "task": "Cooking",
            "s3_path": os.path.join(S3_VIDEO_DIR, "wK9OHVxB_Z8.mp4"),
        }
    ]
    # <batch_id>: list[<video_name>]
    batches = {
        "01/01/2025 - 02/01/2025": [
            "Garlic Noodles - SF Style",
        ]
    }

    to_save = {
        VIDEO_METADATA_KEY: videos,
        USERS_KEY: users,
        BATCHES_KEY: batches,
    }
    _, client = create_client()
    for k, v in to_save.items():
        data = json.dumps(v, indent=2)
        print(f"Writing {k}")
        put_file(client, data, k)
        

if __name__ == "__main__":
    create_sample_data()

    # check loading works
    _ = load_data()
