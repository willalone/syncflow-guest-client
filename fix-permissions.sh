#!/bin/bash

echo "Исправление прав доступа..."

# Исправляем права на node_modules
if [ -d "node_modules" ]; then
    echo "Исправление прав на node_modules..."
    sudo chown -R $(whoami):staff node_modules
fi

# Исправляем права на npm cache
echo "Исправление прав на npm cache..."
sudo chown -R $(whoami):staff ~/.npm

# Исправляем права на package-lock.json если существует
if [ -f "package-lock.json" ]; then
    sudo chown $(whoami):staff package-lock.json
fi

echo "Права доступа исправлены!"
echo "Теперь запустите: npm install"

