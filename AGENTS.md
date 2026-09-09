# Project Instructions

## Runtime
- pnpm 12.3.4

## Run the web server
nohup pnpm start > /tmp/booking-server.log 2>&1 & echo "Server started, PID: $!" && curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8080/

## Stop the web server
pkill -9 -f "live-server . --port=8080" && echo "Server forcefully stopped" || echo "No server running"

## Run tests
pnpm test

## Rules
- Do not add dependencies unless necessary.
- Run tests js or html change
- Update readme.md on new feature if it big enough
