# Бухгалтер — Калькулятор крипто-арбитража

Веб-приложение для расчёта чистой прибыли по крипто-арбитражным операциям с учётом НДФЛ.

## Стек

- **Next.js 14+** (App Router, TypeScript)
- **Tailwind CSS** + кастомные CSS-переменные
- **Prisma** + PostgreSQL (Vercel Postgres или Neon)
- **Vercel Blob** — хранение загружённых выписок
- **papaparse** — разбор CSV
- **pdf-parse** — извлечение текста из PDF

## Деплой на Vercel

### 1. Подключение базы данных

**Вариант A: Vercel Postgres**
1. В дашборде Vercel → Storage → Create Database → Postgres
2. Привяжите БД к проекту

**Вариант B: Neon**
1. Создайте БД на [neon.tech](https://neon.tech)
2. Скопируйте Connection String

### 2. Подключение Vercel Blob
1. В дашборде Vercel → Storage → Create Database → Blob
2. Привяжите Blob Store к проекту

### 3. Переменные окружения

Создайте `.env.local` для локальной разработки (на основе `.env.example`):

```bash
cp .env.example .env.local
```

Заполните значения:

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Токен Vercel Blob (начинается с `vercel_blob_rw_`) |
| `SITE_PASSWORD` | Пароль для доступа к приложению |

Для загрузки переменных из Vercel:
```bash
vercel env pull .env.local
```

### 4. Миграция базы данных

```bash
# Первый деплой
npx prisma migrate deploy

# Или для разработки
npx prisma migrate dev --name init
```

### 5. Деплой

```bash
vercel deploy
```

## Локальная разработка

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## Формула расчёта

```
Доход     = Σ продажи криптовалюты (₽)
Расходы   = Σ покупка крипты
          + Σ комиссия за покупку
          + Σ комиссия за перевод банк→биржа
          + Σ комиссия за продажу
          + Σ подписка «СберПервый»

Чистая прибыль = Доход − Расходы

НДФЛ (прогрессивная шкала):
  ≤ 2 400 000 ₽  → 13%
  > 2 400 000 ₽  → 312 000 + (прибыль − 2 400 000) × 15%

Прибыль после налога = Чистая прибыль − НДФЛ
```
