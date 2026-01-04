#!/bin/sh
set -e

TEMPLATE="/etc/nginx/templates/config.js.template"
TARGET="/usr/share/nginx/html/config.js"

if [ -f "$TEMPLATE" ]; then
  : "${OLLAMA_API_BASE:=http://localhost:11434}"
  : "${BACKEND_API_BASE:=http://localhost:8082}"
  envsubst < "$TEMPLATE" > "$TARGET"
fi

exec nginx -g "daemon off;"
