#!/bin/bash

echo "Создание базовых ресурсов для Expo..."

# Создаем простые placeholder изображения используя ImageMagick или sips (встроенный в macOS)
# Если ImageMagick не установлен, используем sips

ASSETS_DIR="./assets"

# Создаем директорию если не существует
mkdir -p "$ASSETS_DIR"

# Проверяем наличие sips (встроен в macOS)
if command -v sips &> /dev/null; then
    echo "Используем sips для создания изображений..."
    
    # Создаем временное изображение
    # icon.png (1024x1024)
    sips -z 1024 1024 --setProperty format png /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns --out "$ASSETS_DIR/icon.png" 2>/dev/null || \
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > "$ASSETS_DIR/icon.png" 2>/dev/null || \
    echo "Создайте icon.png вручную (1024x1024)"
    
    # Копируем icon для других ресурсов если создан
    if [ -f "$ASSETS_DIR/icon.png" ]; then
        cp "$ASSETS_DIR/icon.png" "$ASSETS_DIR/splash.png" 2>/dev/null
        cp "$ASSETS_DIR/icon.png" "$ASSETS_DIR/adaptive-icon.png" 2>/dev/null
        cp "$ASSETS_DIR/icon.png" "$ASSETS_DIR/favicon.png" 2>/dev/null
        echo "Ресурсы созданы!"
    else
        echo "Не удалось создать изображения автоматически."
        echo "Пожалуйста, создайте следующие файлы вручную:"
        echo "  - $ASSETS_DIR/icon.png (1024x1024)"
        echo "  - $ASSETS_DIR/splash.png (1284x2778 для iPhone)"
        echo "  - $ASSETS_DIR/adaptive-icon.png (1024x1024)"
        echo "  - $ASSETS_DIR/favicon.png (48x48)"
    fi
else
    echo "sips не найден. Создайте ресурсы вручную."
fi

