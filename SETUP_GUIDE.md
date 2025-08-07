# Ganado AI - Setup rápido con Neon + Prisma

1. Crear base de datos en Neon

- Crea un proyecto y copia el connection string (require ssl):

```
postgres://USER:PASSWORD@HOST/dbname?sslmode=require
```

2. Variables de entorno (.env y Vercel)

```
DATABASE_URL="postgres://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
```

3. Cambiar Prisma a Postgres

- `prisma/schema.prisma` ya está con `provider = "postgresql"`.

4. Generar cliente y migrar

```
bun x prisma generate
bun x prisma migrate deploy
```

En desarrollo local puedes usar:

```
bun x prisma migrate dev
```

5. Despliegue en Vercel

- Define las variables en Project Settings → Environment Variables
- Build command: `bun x prisma generate && bun run build`
- Post-deploy (opcional): `bun x prisma migrate deploy`

6. Autenticación Clerk

- Añade las claves en `.env` y Vercel
- Las rutas protegidas requieren sesión

7. PWA/Offline

- Manifest servido en `/manifest.webmanifest`
- SW registrado automáticamente (`/sw.js`)
- Fallback offline: `/offline`
