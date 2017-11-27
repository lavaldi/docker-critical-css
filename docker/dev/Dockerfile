FROM node:9.2.0-slim
LABEL author="Claudia Valdivieso <claudia.valdivieso@orbis.com.pe"
ENV VERSION 1.0

ENV USR_LOCAL=/usr/local
ENV APP_DIR=$USR_LOCAL/app
ENV ENVIRONMENT=dev

RUN chmod 775 -R $USR_LOCAL && \
    mkdir $APP_DIR

# Install latest chrome dev package.
# Note: this installs the necessary libs to make the bundled version of Chromium that Pupppeteer
# installs, work.
RUN apt-get update && apt-get install -y wget --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

ONBUILD COPY node_modules $USR_LOCAL/node_modules
