# Sistema de Turnos - Proección y Moda JLS

Sistema de gestión de turnos para empleados de las tiendas KOAJ y QUEST en Fusagasugá, Colombia.

## Tecnologías

- **Framework:** Next.js 16 (App Router)
- **Base de datos:** Supabase (PostgreSQL)
- **UI:** shadcn/ui + Tailwind CSS v4
- **Idioma:** Español (100% visible)

## Requisitos Previos

- Node.js 24+
- Cuenta en Supabase
- npm

## Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve al SQL Editor y ejecuta: `src/lib/supabase/schema_clean_install.sql`
3. Copia las credenciales:
   - Settings → API → Project URL
   - Settings → API → anon/public key

### 3. Configurar variables de entorno

Crea un archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Iniciar servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Credenciales de Acceso

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | Desarrollador |
| gerente | gerente123 | Gerente |

⚠️ **Cambia las contraseñas en producción**

## Comandos

```bash
npm run dev         # Servidor de desarrollo
npm run build       # Build de producción
npm run start       # Servidor de producción
npm run lint        # ESLint
npm run typecheck   # TypeScript check
```

## Deploy en Vercel

1. Importa este repo en Vercel
2. Configura las Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

---

**Desarrollado por:** Finance Master by Santiago Bermúdez  
**Para:** Proección y Moda JLS  
**2026**
