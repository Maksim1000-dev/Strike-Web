# Strike-Web

Онлайн-шутер в браузере в стиле Counter-Strike (CS 2 / CS:GO) на **Three.js**.
Подробный план проекта — в [PLAN.md](PLAN.md).

## Запуск

```bash
npm install
npm run dev
```

Сервер слушает `0.0.0.0:3000` и раздаёт статику из `client/`, а Three.js — из `node_modules`.

## Управление

- **WASD** — движение
- **Мышь** — обзор (клик захватывает курсор; если Pointer Lock недоступен — зажми и веди мышью)
- **Space** — прыжок
- **Shift** — бег
- **Esc** — выход из захвата курсора

## Структура

```
client/
  index.html          — входная точка
  css/style.css       — стили (HUD, меню)
  js/
    main.js           — сборка сцены, запуск цикла, FPS
    config.js         — настройки графики (Low/Medium/Ultra — растёт в Части 2)
    core/
      engine.js       — рендерер, сцена, камера, игровой цикл
      input.js        — клавиатура
      player.js       — контроллер от первого лица (физика, коллизии)
    world/
      sandbox.js      — песочница: земля, ящики, свет, небо
    ui/hud.js         — HUD, оверлей старта
server/
  dev-server.js       — dev-сервер статики (без внешних зависимостей)
```
