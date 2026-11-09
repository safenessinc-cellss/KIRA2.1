# KIRA 2.1 — entorno de pruebas en Render

Este despliegue es **staging**, separado de Vercel y de producción. No cambia el dominio `kira.coach`.

## Por qué Render

KIRA utiliza React/Vite, un servidor Express/Node.js y WebSockets (`/api/live`). Se despliega como un único servicio Node.js para probar la aplicación completa, no como un sitio estático separado.

## Seguridad antes del primer despliegue

1. Crea un proyecto Firebase independiente para pruebas (por ejemplo, `kira2-staging`). No reutilices el proyecto Firebase de producción: el cliente web puede escribir directamente en Firestore y el modo demo del backend no bloquea por sí solo todas las escrituras del SDK cliente.
2. Habilita Authentication, Firestore y Storage en ese proyecto de staging.
3. Registra en Firebase Authentication el dominio `<nombre-del-servicio>.onrender.com` después de crear el servicio.
4. Crea una cuenta de servicio de staging con permisos mínimos necesarios para las pruebas y pega su JSON solamente en el campo secreto de Render.
5. Configura los valores `VITE_FIREBASE_*` con la configuración web del proyecto de staging. Son configuración pública del cliente, no claves privadas.
6. Mantén `KIRA_DEMO_MODE=true`. No uses claves de pagos reales: para probar pagos, usa Stripe test mode y credenciales sandbox de Mercado Pago.

## Crear el servicio

1. Abre https://dashboard.render.com/ y conecta GitHub si todavía no está conectado.
2. Selecciona **New → Blueprint**.
3. Elige este repositorio y la rama `deploy/kira-render-staging`.
4. Render detectará `render.yaml`. Revisa el servicio `kira-2-1-staging` y crea el Blueprint.
5. Completa las variables marcadas como secretas con los valores del proyecto Firebase de staging. No pegues secretos en GitHub, archivos del repositorio ni en el chat.
6. Cuando Render termine, abre `/api/health` en el dominio `onrender.com`. Debe devolver `status: "ok"` y `readOnly: true`.
7. Comprueba primero login, rutas, carga de módulos y logs. Después ejecuta el plan de pruebas funcionales.

## Variables necesarias

- Firebase staging: `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_STORAGE_BUCKET` y todas las `VITE_FIREBASE_*`.
- URL pública: `KIRA_APP_URL`, con la URL `onrender.com` asignada por Render.
- Opcionales según el módulo: `GEMINI_API_KEY`, secretos de firma/cifrado, cron, CAPTCHA, WhatsApp y credenciales sandbox de pagos.
- Nunca copies secretos de producción a este entorno salvo que hayas creado credenciales independientes de staging.

## Límites del plan gratuito

Render Free puede suspender el servicio tras 15 minutos sin tráfico; el siguiente arranque puede tardar alrededor de un minuto. El sistema de archivos local es efímero. Los archivos persistentes deben ir a Firebase Storage, no al disco local del servicio.

## Alcance y límites

El Blueprint prepara la infraestructura y el proceso de despliegue; no crea el proyecto Firebase, no copia datos, no autoriza dominios en Firebase y no configura secretos automáticamente. Un despliegue exitoso tampoco equivale a una certificación funcional: hay que probar cada flujo con cuentas de prueba y datos de staging.
