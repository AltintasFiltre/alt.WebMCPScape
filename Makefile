# Makefile for alt.CrossScraper Project

.PHONY: help install start dev build docker-build docker-push docker-run docker-stop

help:
	@echo "Available commands:"
	@echo "  install      - Backend ve Frontend bağımlılıklarını kurar."
	@echo "  start        - Uygulamayı production modunda başlatır (npm start)."
	@echo "  dev          - Hem backend hem frontend'i geliştirme modunda başlatır (npm run dev)."
	@echo "  build        - Frontend projesini derler (client/dist)."
	@echo "  docker-build - Proje için Docker imajını oluşturur."
	@echo "  docker-push  - Proje Docker imajını ($(PLATFORM)) derler ve registry'ye pushlar."
	@echo "  docker-run   - Docker konteynerini çalıştırır."
	@echo "  docker-stop  - Çalışan Docker konteynerini durdurur."

install:
	@echo "Installing dependencies for alt.CrossScraper..."
	npm install
	cd client && npm install

start:
	@echo "Starting alt.CrossScraper..."
	npm start

dev:
	@echo "Starting alt.CrossScraper in development mode..."
	npm run dev

build:
	@echo "Building alt.CrossScraper client..."
	cd client && npm run build

REGISTRY ?= ghcr.io/altintasfiltre
GIT_TAG  := $(shell git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d-%H%M%S)
TAG      ?= $(GIT_TAG)
PLATFORM ?= linux/amd64
IMAGE_NAME := alt-cross-scraper

# make docker-push TAG=v1.0.1
docker-build:
	@echo "Building Docker image for alt.CrossScraper..."
	docker build -t $(REGISTRY)/$(IMAGE_NAME):$(TAG) -t $(REGISTRY)/$(IMAGE_NAME):latest -t $(IMAGE_NAME):latest .

docker-push:
	@echo "Building and pushing Docker image for alt.CrossScraper ($(PLATFORM)) as :$(TAG) and :latest..."
	docker buildx build --platform $(PLATFORM) -t $(REGISTRY)/$(IMAGE_NAME):$(TAG) -t $(REGISTRY)/$(IMAGE_NAME):latest . --push

docker-run:
	@echo "Running Docker container for alt.CrossScraper..."
	docker run -d --name alt-cross-scraper-container --env-file .env -p 4002:4002 -v $(PWD)/data:/app/data $(REGISTRY)/$(IMAGE_NAME):$(TAG)

docker-stop:
	@echo "Stopping and removing Docker container for alt.CrossScraper..."
	docker stop alt-cross-scraper-container || true
	docker rm alt-cross-scraper-container || true
