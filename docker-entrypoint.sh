#!/bin/sh
set -e
node /prisma-cli/node_modules/prisma/build/index.js migrate deploy
exec node server.js
