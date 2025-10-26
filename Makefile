# Simple helper commands for Oakley's World

NODE_BIN ?= node
NPM_BIN ?= npm
HOST ?= 0.0.0.0
PORT ?= 3000
IMAGE ?= oakleys-world

.PHONY: help install run start stop clean docker-build docker-run docker-stop docker-shell

help:
	@echo "Available targets:"
	@echo "  make install       Install Node dependencies"
	@echo "  make run           Start the server (foreground)"
	@echo "  make start         Start server in background with nohup"
	@echo "  make stop          Stop background server started via make start"
	@echo "  make clean         Remove node_modules and build artifacts"
	@echo "  make docker-build  Build the Docker image (IMAGE=$(IMAGE))"
	@echo "  make docker-run    Run the Docker container (port $(PORT))"
	@echo "  make docker-stop   Stop running Docker container"
	@echo "  make docker-shell  Shell into the running container"

install:
	$(NPM_BIN) install

run:
	HOST=$(HOST) PORT=$(PORT) $(NPM_BIN) start

start:
	nohup HOST=$(HOST) PORT=$(PORT) $(NPM_BIN) start >/tmp/oakley.log 2>&1 &
	@echo $$! > /tmp/oakley.pid
	@echo "Server started in background (PID $$(cat /tmp/oakley.pid))"

stop:
	@if [ -f /tmp/oakley.pid ]; then \
		kill $$(cat /tmp/oakley.pid) 2>/dev/null || true; \
		rm /tmp/oakley.pid; \
		echo "Server stopped"; \
	else \
		echo "No PID file found"; \
	fi

clean:
	rm -rf node_modules package-lock.json
	if [ -f /tmp/oakley.pid ]; then rm /tmp/oakley.pid; fi

docker-build:
	docker build -t $(IMAGE) .

docker-run: docker-build
	docker run --rm -d --name $(IMAGE) -p $(PORT):3000 -e PORT=$(PORT) -e HOST=$(HOST) $(IMAGE)

docker-stop:
	-docker stop $(IMAGE)

docker-shell:
	docker exec -it $(IMAGE) /bin/sh
