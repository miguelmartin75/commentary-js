import json
from typing import Dict, Any, List
from collections import defaultdict
from dataclasses import dataclass

from iopath.common.file_io import PathManager
from iopath.common.s3 import S3PathHandler

pathmgr = PathManager()  # for downloading files
pathmgr.register_handler(S3PathHandler(profile=None))

USER_PATH = "s3://ego4d-consortium-sharing/egoexo/expert_commentary/users_09202023.json"
METADATA_PATH = "s3://ego4d-consortium-sharing/egoexo/expert_commentary/metadata_231007.json"
BATCHES_PATH = "s3://ego4d-consortium-sharing/egoexo/expert_commentary/batches/batches_231007.json"


@dataclass
class EgoExoData:
    users: Dict[str, str]
    batches: Dict[str, str]
    videos_by_name: Dict[str, Dict[str, Any]]
    videos_by_task: Dict[str, List[Dict[str, Any]]]



TASK_ID_RANGE = {
    (1000, 2000): "Cooking",
    (2000, 3000): "Health",
    (3000, 4000): "Campsite",
    (4000, 5000): "Bike Repair",
    (5000, 6000): "Music",
    (6000, 7000): "Basketball",
    (7000, 8000): "Rock Climbing",
    (8000, 9000): "Soccer",
    (9000, 10000): "Dance",
}

def to_task_cat(tid):
    for (x1, x2), cat in TASK_ID_RANGE.items():
        if tid >= x1 and tid < x2:
            return cat
    return None


def load_data():
    users = json.load(pathmgr.open(USER_PATH))
    data = json.load(pathmgr.open(METADATA_PATH))
    batches = json.load(pathmgr.open(BATCHES_PATH))
    print(f"Loaded: {len(data)} takes")
    by_task = defaultdict(list)
    by_name = {}
    for x in data:
        if x["s3_path"] is None:
            print(f"Skipping: {x}")
            continue
        name = x["take_name"]
        task_cat = x["task_cat"]

        by_task[task_cat].append(x)
        assert name not in by_name
        by_name[name] = x

    for cat in by_task.keys():
        if cat is None:
            print("No category, skipping", len(by_task[cat]))
            continue
        user_id = cat.split(" ")[0].lower() + "_test_meta_"
        users[user_id] = cat
        print(user_id)

    users["correctvideo"] = "Test"
    take_name = "Test_Example"
    task_name = "Test"
    take_data = {
        "task_name": task_name,
        "take_name": take_name,
        "s3_path": "s3://ego4d-consortium-sharing/egoexo/expert_commentary/pilot/example_video.mp4"
    }
    by_name[take_name] = take_data
    by_task[task_name] = [take_data]

    batches_by_video_name = {
        v: k for k, temp in batches.items() 
        for _, vs in temp.items()
        for v in vs
    }

    return EgoExoData(
        users=users,
        batches=batches_by_video_name,
        videos_by_name=by_name,
        videos_by_task=by_task,
    )
