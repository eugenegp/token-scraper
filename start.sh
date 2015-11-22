#!/usr/bin/env bash
export REDIS_HOST=${REDIS_PORT_6379_TCP_ADDR}
export REDIS_PORT=${REDIS_PORT_6379_TCP_PORT}

/usr/bin/nodejs token-scraper-redis.js 8666