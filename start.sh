#!/usr/bin/env bash
# Start backend

node ./jobs/processJobs.js &
node server.js
