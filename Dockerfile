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
# RUN apt install -y curl
# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# ENV NVM_DIR=/root/.nvm-sh
# RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
# RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
# ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

RUN npm install
ENV PYTHONPATH="."


EXPOSE ${PORT}
CMD ["npm", "run", "dev"]

