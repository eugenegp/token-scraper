FROM pataquets/phantomjs

MAINTAINER eugeneiso

ENV TOKEN_SCRAPER_VERSION 0.1.2

RUN apt-get update && apt-get install -y node npm && apt-get purge -y --auto-remove && apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    mkdir -p /opt/app

ADD https://github.com/eugenegp/uzticketstat/archive/v${TOKEN_SCRAPER_VERSION}.tar.gz /tmp/
RUN cd /tmp && tar -xzvf v${TOKEN_SCRAPER_VERSION}.tar.gz && \
    mv /tmp/uzticketstat-${TOKEN_SCRAPER_VERSION}/* /opt/app/token && \
    node install

ADD token-scraper.js /opt/app/token-scraper.js
ADD token-scraper.js /opt/app/token-scraper-redis.js
ADD token-scraper.js /opt/app/token-scraper-redis.js

WORKDIR /opt/app

EXPOSE 8666

# Default command
CMD [" /usr/bin/node", "token-scraper-redis.js", "8666"]
