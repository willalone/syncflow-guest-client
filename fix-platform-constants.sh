#!/bin/bash

echo "🔧 Исправление ошибки PlatformConstants..."
echo ""

# Шаг 1: Остановить все процессы Metro/Expo
echo "1. Остановка процессов Metro/Expo..."
pkill -f "expo start" || true
pkill -f "metro" || true
sleep 2

# Шаг 2: Очистка кешей
echo "2. Очистка кешей..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
rm -rf $TMPDIR/react-*

# Шаг 3: Очистка кеша npm
echo "3. Очистка кеша npm..."
npm cache clean --force 2>/dev/null || echo "⚠️  Проблемы с очисткой npm cache (требуются права)"

# Шаг 4: Исправление прав доступа (если требуется)
echo "4. Проверка прав доступа..."
if [ -d "node_modules" ] && [ "$(stat -f '%Su' node_modules 2>/dev/null)" = "root" ]; then
    echo "   ⚠️  node_modules принадлежит root. Требуется исправление:"
    echo "   Выполните: sudo chown -R \$(whoami):staff node_modules ~/.npm"
    echo ""
    read -p "   Исправить права доступа сейчас? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo chown -R $(whoami):staff node_modules ~/.npm
        echo "   ✅ Права доступа исправлены"
    else
        echo "   ⚠️  Пропущено. Установите зависимости вручную после исправления прав."
        exit 1
    fi
fi

# Шаг 5: Переустановка зависимостей
echo "5. Переустановка зависимостей..."
npm install

# Шаг 6: Очистка кеша Watchman (если установлен)
if command -v watchman &> /dev/null; then
    echo "6. Очистка кеша Watchman..."
    watchman watch-del-all 2>/dev/null || true
fi

echo ""
echo "✅ Очистка завершена!"
echo ""
echo "Теперь запустите:"
echo "  npm start -- --clear"
echo ""
echo "Или для iOS:"
echo "  npx expo start --ios --clear"
echo ""
echo "Или для Android:"
echo "  npx expo start --android --clear"

