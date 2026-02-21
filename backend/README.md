# Backend (NestJS + Prisma)

## Быстрый старт

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run start:dev
```

API будет доступен по адресу `http://localhost:3000/api/v1`.

Проверка доступности:

```bash
curl http://localhost:3000/api/v1/health
```
