FROM python:3.11

ENV NODE_VERSION=18.14
ENV PORT=3333

RUN mkdir /app
WORKDIR /app
ADD . /app/
RUN pip install -r requirements.txt

RUN apt-get update && apt-get install -y \
    software-properties-common \
    npm
RUN npm install npm@latest -g && \
    npm install n -g && \
    n latest

RUN npm install
ENV PYTHONPATH="."


EXPOSE ${PORT}
CMD ["npm", "run", "dev"]
