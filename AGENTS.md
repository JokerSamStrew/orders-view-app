# Project Instructions

## Runtime
- uv 0.12.1

## Run the web server
nohup uv run python -m http.server 8080 > /tmp/booking-server.log 2>&1 & echo "Server started, PID: $!" && curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8080/

## Stop the web server
pkill -9 -f "http.server 8080" && echo "Server forcefully stopped" || echo "No server running"

## Run tests
pnpx vitest run

## Rules
- Do not add dependencies unless necessary.
- Run tests js or html change
- Update readme.md on new feature if it big enough
