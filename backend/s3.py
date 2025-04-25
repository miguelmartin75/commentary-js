import logging
import boto3
from botocore.exceptions import ClientError

from backend.constants import (
    AWS_SECRET_ACCESS_KEY,
    AWS_ACCESS_KEY,
    S3_REGION_NAME,
    S3_ENDPOINT_URL,
    S3_BUCKET,
)


def create_client():
    session = boto3.session.Session()
    client = session.client(
        "s3",
        region_name=S3_REGION_NAME,
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )
    return session, client


def split_s3_path(s3_path):
    path_parts = s3_path.replace("s3://", "").split("/")
    bucket = path_parts[0]
    key = "/".join(path_parts[1:])
    return bucket, key


def create_presigned_url_from_path(s3_path, **kwargs):
    print("create_presigned_url_from_path", s3_path)
    bucket, key = split_s3_path(s3_path)
    _, client = create_client()
    print("bucket=", bucket)
    print("key=", key)
    try:
        url = client.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                "Bucket": bucket,
                "Key": key,
                # "ResponseContentType": f"video/webm",
            },
            ExpiresIn=kwargs.get("expiration", None),
        )
    except ClientError as e:
        logging.error(e)
        return None
    return url

def read_file(client, key, bucket=S3_BUCKET):
    obj = client.get_object(Key=key, Bucket=bucket)
    return obj["Body"]

def put_file(client, data, key, bucket=S3_BUCKET):
    client.put_object(Body=data, Key=key, Bucket=bucket)
