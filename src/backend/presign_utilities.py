#!/usr/bin/env python3

import logging
import boto3
from botocore.exceptions import ClientError


def split_s3_path(s3_path):
    path_parts = s3_path.replace("s3://", "").split("/")
    bucket = path_parts.pop(0)
    key = "/".join(path_parts)
    return bucket, key


def create_presigned_url_from_path(s3_path, **kwargs):
    try:
        bucket, key = split_s3_path(s3_path)
        url = create_presigned_url(bucket, key, **kwargs)
        # print(url)
        return url
    except Exception as e:
        print(e)
        return None


def create_presigned_url(bucket_name, object_name, expiration=28800):
    """Generate a presigned URL to share an S3 object

    :param bucket_name: string
    :param object_name: string
    :param expiration: Time in seconds for the presigned URL to remain valid
    :return: Presigned URL as string. If error, returns None.
    """

    # Get region for bucket
    s3_client = boto3.client("s3")
    response = s3_client.get_bucket_location(Bucket=bucket_name)

    # Generate a presigned URL for the S3 object
    s3_client = boto3.client("s3", region_name=response["LocationConstraint"])
    try:
        response = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": object_name},
            ExpiresIn=expiration,
        )
    except ClientError as e:
        logging.error(e)
        return None

    # The response contains the presigned URL
    return response
