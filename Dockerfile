FROM python:3.11

ENV PORT=3333

RUN mkdir /app
WORKDIR /app
ADD . /app/
RUN pip install -r requirements.txt

# see https://deb.nodesource.com/
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - 
RUN apt-get install -y nodejs

RUN npm install
ENV PYTHONPATH="."

EXPOSE ${PORT}
CMD ["npm", "run", "prod"]
