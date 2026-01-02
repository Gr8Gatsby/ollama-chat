.PHONY: help dev start stop restart logs logs-backend logs-frontend logs-ollama clean build pull-model list-models setup health

# Default model to pull
DEFAULT_MODEL ?= llama2

help: ## Show this help message
	@echo "Ollama Chat - Development Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	@echo "Starting development environment..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

start: dev ## Alias for dev

stop: ## Stop all services
	@echo "Stopping all services..."
	docker-compose down

restart: stop dev ## Restart all services

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs only
	docker-compose logs -f backend

logs-frontend: ## View frontend logs only
	docker-compose logs -f frontend

logs-ollama: ## View Ollama logs only
	docker-compose logs -f ollama

clean: ## Stop and remove all containers, networks, and volumes
	@echo "Cleaning up..."
	docker-compose down -v
	rm -rf data/*.db data/*.db-shm data/*.db-wal

build: ## Build Docker images
	@echo "Building Docker images..."
	docker-compose build

rebuild: clean build ## Clean and rebuild everything

pull-model: ## Pull a model (use MODEL=name to specify, default: llama2)
	@echo "Pulling model: $(or $(MODEL),$(DEFAULT_MODEL))"
	docker-compose exec ollama ollama pull $(or $(MODEL),$(DEFAULT_MODEL))

list-models: ## List available models in Ollama
	docker-compose exec ollama ollama list

setup: build ## First-time setup: build, start services, and pull default model
	@echo "Running first-time setup..."
	@make build
	@echo "Starting services..."
	@docker-compose up -d
	@echo "Waiting for Ollama to be ready..."
	@sleep 10
	@echo "Pulling default model ($(DEFAULT_MODEL))..."
	@make pull-model MODEL=$(DEFAULT_MODEL)
	@echo ""
	@echo "Setup complete! Run 'make dev' to start development."

health: ## Check health of all services
	@echo "Checking service health..."
	@echo -n "Frontend: "
	@curl -s http://localhost:3000 > /dev/null && echo "✓ OK" || echo "✗ FAIL"
	@echo -n "Backend: "
	@curl -s http://localhost:8080/health > /dev/null && echo "✓ OK" || echo "✗ FAIL"
	@echo -n "Ollama: "
	@curl -s http://localhost:11434/api/tags > /dev/null && echo "✓ OK" || echo "✗ FAIL"

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-ollama: ## Open shell in Ollama container
	docker-compose exec ollama sh

db-backup: ## Backup database
	@mkdir -p data/backups
	@echo "Backing up database..."
	@cp data/ollama-chat.db data/backups/ollama-chat-$(shell date +%Y%m%d-%H%M%S).db
	@echo "Backup created in data/backups/"

status: ## Show status of all containers
	docker-compose ps
