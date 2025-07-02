# EasyDaddy Extension Architecture

## 🎯 Целевые браузеры и версии

- Google Chrome (актуальные версии, LTS)
- Arc Browser
- Microsoft Edge (Chromium)
- Mozilla Firefox (WebExtensions)
- Opera (Chromium)
- **Apple Safari (Safari 11+, WebExtensions API)**

## 🏗️ Архитектурные паттерны для кросс-браузерности

- **Единая кодовая база**: Использование WebExtensions API и Manifest V3 для максимального покрытия
- **browser-compat.ts**: Универсальная обертка для API (chrome, browser, window)
- **Минимизация browser-specific кода**: Все различия инкапсулируются в одном слое
- **Feature detection**: Проверка возможностей API, а не user agent sniffing
- **Graceful degradation**: В Safari и других браузерах с ограничениями — fallback UI и сообщения

## 🍏 Особенности поддержки Safari/WebKit

- **WebExtensions API**: Используется для портирования расширения в Safari
- **Manifest V3**: Следование ограничениям Safari (например, service worker, permissions)
- **CSP и sandbox**: Учет особенностей CSP в Safari
- **Ограничения**: Нет поддержки некоторых Chrome-only API, возможны отличия в работе content scripts
- **Сборка**: Использование инструментов для упаковки WebExtension в .safariextz (Xcode, Safari Extension Converter)
- **Тестирование**: Регулярная проверка в Safari Technology Preview

## 🍏 Safari: Known Issues & Build Instructions

### Как собрать и установить расширение в Safari

- Используйте Xcode (File → New → Project → macOS → App → Safari Web Extension)
- Импортируйте существующую папку расширения (WebExtension)
- Xcode автоматически сгенерирует проект с поддержкой Safari
- Соберите и запустите расширение через Xcode (Run)
- Включите расширение в настройках Safari

### Известные ограничения и workaround

- Не поддерживаются некоторые Chrome-only API (chrome.scripting, chrome.action)
- CSP в Safari строже, чем в Chrome/Firefox (запрещены inline-скрипты, eval)
- Возможны проблемы с dynamic import и pdfjs-dist (PDF обработка)
- Messaging между background и content script может работать иначе
- Для storage рекомендуется использовать browser.storage.local
- Для fallback UI используйте feature detection (window.safari, browser, chrome)
- Все разрешения должны быть явно указаны в manifest.json

> Рекомендуется тестировать расширение в Safari Technology Preview и фиксировать все Safari-специфичные баги в Known Issues.

## 🧪 Стратегия тестирования и поддержки

- **Автоматические тесты**: Проверка базовой функциональности во всех поддерживаемых браузерах
- **Ручное тестирование**: В Safari, Arc, Firefox, Edge, Chrome
- **CI/CD**: Планируется интеграция с SauceLabs/BrowserStack для кросс-браузерных тестов
- **Документация**: Все ограничения и known issues фиксируются в README и ARCHITECTURE.md

## 🚩 Known Issues & Roadmap

- Safari: Возможны ограничения с PDF, background scripts, storage
- Arc: Особенности открытия popup (см. README)
- Firefox: Отличия в реализации некоторых API

> **Миссия:** Поддерживать и развивать расширение как truly universal WebExtension для всех современных браузеров, включая Safari. 