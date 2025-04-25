#!/bin/bash

yt-dlp "https://www.youtube.com/watch?v=wK9OHVxB_Z8" -o wK9OHVxB_Z8
ffmpeg -y -i wK9OHVxB_Z8.webm -vf scale=-1:720 wK9OHVxB_Z8.mp4
# s3cmd put wK9OHVxB_Z8.mp4 s3://mm-dev/commentary-js/videos/wK9OHVxB_Z8.mp4

yt-dlp https://www.youtube.com/watch?v=IF22i8SQVWk -o IF22i8SQVWk
ffmpeg -i IF22i8SQVWk.webm -vf scale=-1:720 IF22i8SQVWk.mp4
# s3cmd put IF22i8SQVWk.mp4 s3://mm-dev/commentary-js/videos/IF22i8SQVWk.mp4
