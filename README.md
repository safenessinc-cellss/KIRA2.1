# KIRA Coach — Plataforma de coaching y bienestar

Aplicación web KIRA Coach, desarrollada por **SAFENESS.INC**.

## Desarrollo local

Requisitos: Node.js 20+.

1. Instala dependencias: `npm install`
2. Configura las variables de entorno localmente en `.env.local` (no subir secretos al repositorio).
3. Ejecuta `npm run dev`.
4. Genera la compilación: `npm run build`.

## Variables de entorno

Consulta `.env.example`. Nunca compartas ni commits claves de Gemini, Stripe, Firebase Admin u otros servicios.

## Créditos

Creado por **SAFENESS.INC**.


## Certificados institucionales (Firestore + Firebase Storage)

La emisión utiliza el backend Express y el proyecto Firebase existente. Los documentos se guardan en `certificates`, la proyección pública mínima en `certificatePublic` y los eventos de auditoría en `certificate_audit`. No se usa PostgreSQL/SQL porque KIRA está basado en Firestore.

Variables de servidor requeridas en Vercel (Production y Preview):

- `CERT_SECRET`: secreto aleatorio de al menos 32 caracteres para HMAC-SHA256. Mantener exclusivamente como variable sensible del servidor.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: cuenta de servicio del proyecto `kira2-a6a20`, con permisos Firestore y Firebase Storage.
- `FIREBASE_STORAGE_BUCKET` (o `VITE_FIREBASE_STORAGE_BUCKET`): bucket del proyecto Firebase.
- `KIRA_APP_URL`: URL pública canónica, por ejemplo `https://kira.coach`.

En el panel de administración, cargar el logo PNG institucional, la firma del superadministrador y la firma PNG de cada coach. Se almacenan bajo `certificates/private/` y las reglas de Storage impiden su lectura pública. No subir secretos al repositorio ni compartirlos por chat.

La emisión verifica identidad/rol, curso, coach responsable, matrícula finalizada y pago verificado cuando el curso es de pago. El servidor genera número único, fecha, firma HMAC, QR, PDF A4 horizontal y registro de auditoría. La ruta pública `/verify/:kiraNumber?sig=...` valida la firma y muestra revocaciones. La descarga PDF exige autenticación del alumno propietario o del administrador.

**Importante:** la función no estará operativa hasta configurar las variables de servidor anteriores y cargar los tres activos oficiales. No se habilita emisión simulada ni se usan imágenes placeholder.
