import json
from typing import Dict, Any, List
from collections import defaultdict
from dataclasses import dataclass

from iopath.common.file_io import PathManager
from iopath.common.s3 import S3PathHandler

pathmgr = PathManager()  # for downloading files
pathmgr.register_handler(S3PathHandler(profile="default"))

METADATA_PATH = "s3://ego4d-consortium-sharing/egoexo/expert_commentary/ec_metadata.json"


@dataclass
class EgoExoData:
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
    data = json.load(pathmgr.open(METADATA_PATH))
    by_task = defaultdict(list)
    by_name = {}
    for x in data:
        if x["s3_path"] is None:
            print(f"Skipping: {x}")
            continue
        name = x["s3_path"].split("/")[-2]
        task_name = to_task_cat(x["task_id"])
        by_task[task_name].append(x)
        assert name not in by_name
        by_name[name] = x
    return EgoExoData(
        videos_by_name=by_name,
        videos_by_task=by_task,
    )
