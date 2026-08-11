# Construction Project Management SaaS

Modular monolith for Release 1 (MVP) + Release 2 Ops (procurement / inventory).

## Stack

- `backend/` — Laravel 12 + Sanctum API (`/api/v1`)
- `frontend/` — React + Vite SPA
- `database/r1_schema.sql` — R1 shared MySQL schema (`cpm`)
- `database/r2_ops_schema.sql` — R2 procurement + inventory tables

## Prerequisites

- PHP 8.2+, Composer
- Node 20+
- MySQL 8 (XAMPP) with database `cpm`

## Backend setup

```bash
cd backend
cp .env.example .env   # if needed; .env already points to MySQL cpm
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

API base: `http://127.0.0.1:8000/api/v1`

### Auth endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | Creates tenant + owner + company |
| POST | `/auth/login` | Returns Sanctum token |
| GET | `/auth/me` | Requires `Authorization` + tenant context |
| POST | `/auth/logout` | Revokes current token |
| POST | `/auth/switch-tenant` | Switch active tenant |

Tenant context header: `X-Tenant-ID` (or `X-Tenant-Slug`).  

### R2 Ops flow

Material Request → Purchase Request → Purchase Order → Goods Receipt → Stock → Material Issue

Permissions: `procurement.view|manage`, `inventory.view|manage`
If the user has exactly one active membership, tenant is inferred.

Permission middleware alias: `permission:users.view`

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

## Domain layout (backend)

```
app/Core/Tenant
app/Core/Auth
app/Core/RBAC
app/Modules/Organization
app/Shared
```
