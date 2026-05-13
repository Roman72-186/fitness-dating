#!/bin/bash
# Скрипт первого деплоя и обновления на VPS
# Запускать на сервере: bash deploy.sh

set -e

APP_DIR="/opt/fitness-dating"

echo "=== Деплой fitness-dating ==="

# Создаём директорию если нет
mkdir -p "$APP_DIR"

# Устанавливаем Docker если нет
if ! command -v docker &> /dev/null; then
  echo "Устанавливаю Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# Переходим в директорию приложения
cd "$APP_DIR"

# .env должен быть создан вручную до запуска этого скрипта
if [ ! -f .env ]; then
  echo "ОШИБКА: Создай .env файл в $APP_DIR перед деплоем"
  echo "Пример: cp .env.example .env && nano .env"
  exit 1
fi

echo "=== Применяем миграции БД ==="
docker compose run --rm app sh -c "npx prisma migrate deploy"

echo "=== Перезапускаем сервисы ==="
docker compose up -d --build

echo "=== Статус ==="
docker compose ps

echo ""
echo "Деплой завершён. Приложение доступно на порту 80."
echo "Логи: docker compose logs -f app"
