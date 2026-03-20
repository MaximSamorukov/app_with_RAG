  ✦ Фаза 0 завершена! Вот что было создано:

    📦 Созданные компоненты


    ┌───────────────────┬──────────────────────────────────────────────────────────┐
    │ Категория         │ Файлы                                                    │
    ├───────────────────┼──────────────────────────────────────────────────────────┤
    │ Docker            │ docker-compose.yml (postgres, redis, minio, api, worker) │
    │ Конфигурация      │ .env.example (40+ переменных)                            │
    │ Backend Structure │ server/api/, server/worker/ с полным scaffolding         │
    │ Database          │ 10 TypeORM сущностей + миграции с pgvector               │
    │ API               │ Express сервер с health check endpoints                  │
    │ Dockerfiles       │ Оптимизированные билды для api и worker                  │
    └───────────────────┴──────────────────────────────────────────────────────────┘


    🚀 Быстрый старт

      1 # 1. Запуск инфраструктуры
      2 docker-compose up -d postgres redis minio
      3 
      4 # 2. Установка зависимостей API
      5 cd server/api && npm install
      6 
      7 # 3. Миграции БД
      8 npm run migration:run
      9 
     10 # 4. Запуск API
     11 npm run dev
     12 
     13 # 5. Запуск воркера (отдельный терминал)
     14 cd ../worker && npm install && npm run dev

    ⚠ Важно перед запуском

     1. Скопируйте `.env.example` → `.env` и задайте:
        - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
        - AI_API_KEY (OpenAI/Anthropic или custom endpoint)

     2. Создайте бакет MinIO:
        - Консоль: http://localhost:9001
        - Логин/пароль: minioadmin / minioadmin
        - Бакет: rag-assistant-documents

    ✅ Проверка работоспособности

     1 curl http://localhost:3000/api/v1/health

    Готово к Фазе 1 (аутентификация и RBAC)?
