# Guía de Despliegue en Vercel

Para probar la aplicación en tu celular con el micrófono funcionando, necesitamos HTTPS. La forma más rápida y gratuita es usar **Vercel**.

## Paso 1: Instalar y Login
Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
npx vercel login
```
*Sigue las instrucciones (te pedirá email o GitHub) para iniciar sesión.*

## Paso 2: Desplegar
Una vez logueado, ejecuta:

```bash
npx vercel
```
Responde a las preguntas así (presiona Enter para casi todo):
- Set up and deploy? **y**
- Which scope? **(Tu usuario)**
- Link to existing project? **N**
- Project name? **bitacora-datactar** (o enter para default)
- In which directory? **./** (enter)
- Want to modify default settings? **N** (Vite se detecta automáticamente)

Vercel subirá tu código y te dará una URL de producción (ej: `https://bitacora-datactar.vercel.app`).

## Paso 3: Configurar Variables (IMPORTANTE)
Tu app fallará al inicio porque le faltan las claves de Supabase y OpenAI en la nube.

1. Ve al [Dashboard de Vercel](https://vercel.com/dashboard).
2. Entra a tu proyecto nuevo.
3. Ve a **Settings** > **Environment Variables**.
4. Agrega las siguientes variables (copiándolas de tu archivo `.env.local`):

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | *(Copia el valor de tu .env.local)* |
| `VITE_SUPABASE_ANON_KEY` | *(Copia el valor de tu .env.local)* |
| `VITE_OPENAI_API_KEY` | *(Copia el valor de tu .env.local)* |

5. **Redesplegar**: Para que las variables tomen efecto, ve a la pestaña **Deployments**, haz click en los 3 puntos del último deploy y dale a **Redeploy**.

¡Listo! Ahora abre el link en tu celular y el micrófono funcionará perfectamente.
