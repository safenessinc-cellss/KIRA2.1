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

- `KIRA_CERTIFICATE_SIGNING_SECRET`: secreto aleatorio de al menos 32 caracteres para HMAC-SHA256 de certificados. Mantener exclusivamente como variable sensible del servidor.
- `KIRA_CONFIG_ENCRYPTION_KEY`: clave AES-256 de 32 bytes (base64 o 64 caracteres hex) para cifrar claves de pasarelas en Firestore; nunca se guarda en la base de datos.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: cuenta de servicio del proyecto `kira2-a6a20`, con permisos Firestore y Firebase Storage.
- `FIREBASE_STORAGE_BUCKET` (o `VITE_FIREBASE_STORAGE_BUCKET`): bucket del proyecto Firebase.
- `KIRA_APP_URL`: URL pública canónica, por ejemplo `https://kira.coach`.

### Centro de Pagos (solo superadministrador)

El panel `Admin > Finanzas > Configuración de pagos` administra `paymentSettings/global`, `paymentGateways`, `paymentPlans`, `paymentCoupons`, `paymentAudit` y `config_audit`. Los secretos se cifran con AES-256-GCM en el backend y nunca se devuelven al cliente. Permite configurar Stripe y Mercado Pago, elegir modo test/live, definir monedas, planes y cupones, y probar conectividad sin realizar cobros. Checkout solo muestra proveedores habilitados desde el Dashboard y exige webhook configurado. La configuración global puede apagar checkout y restringe las monedas aceptadas. Los planes recurrentes de Mercado Pago permanecen deshabilitados. Reembolsos, contracargos, facturación fiscal, impuestos, dunning y payouts aún requieren implementación y pruebas antes de considerarlos disponibles. La clave maestra de cifrado permanece como secreto server-only.

En el panel de administración, cargar el logo PNG institucional, la firma del superadministrador y la firma PNG de cada coach. Se almacenan bajo `certificates/private/` y las reglas de Storage impiden su lectura pública. No subir secretos al repositorio ni compartirlos por chat.

La emisión verifica identidad/rol, curso, coach responsable, matrícula finalizada y pago verificado cuando el curso es de pago. El servidor genera número único, fecha, firma HMAC, QR, PDF A4 horizontal y registro de auditoría. La ruta pública `/verify/:kiraNumber?sig=...` valida la firma y muestra revocaciones. La descarga PDF exige autenticación del alumno propietario o del administrador.

**Importante:** la función no estará operativa hasta configurar las variables de servidor anteriores y cargar los tres activos oficiales. No se habilita emisión simulada ni se usan imágenes placeholder.


## Arquitectura y seguridad (rama de auditoría)

- [Blueprint integral de arquitectura, módulos, seguridad y coherencia](docs/architecture/KIRA-SECURITY-COHERENCE-BLUEPRINT.md)
- [Inventario técnico y roadmap](docs/architecture/KIRA-MODULE-INVENTORY.md)
- [OpenAPI de pagos y configuración](docs/api/kira-payments-config-v1.openapi.yaml)
- [ADR-0001: Firestore como base primaria](docs/adr/0001-firestore-primary-database.md)
- [ADR-0002: configuración de pagos Superadmin](docs/adr/0002-superadmin-payment-configuration.md)
- [ADR-0003: transacciones de dominio y outbox](docs/adr/0003-domain-transactions-and-outbox.md)
- [Árbol oficial del backoffice y estado de integración](docs/architecture/KIRA-BACKOFFICE-NAVIGATION.md)
- [OpenAPI 3.1 de Dashboard y CRM](docs/api/kira-backoffice-crm-dashboard-v1.openapi.yaml)
- [ADR-0004: navegación oficial y vertical CRM](docs/adr/0004-official-backoffice-navigation.md)
- [Seed inicial de permisos por rol (propuesto, no aplicado)](docs/security/kira-backoffice-role-permission-seed.json)

El backoffice ahora integra una primera vertical funcional de Dashboard y CRM en la rama de auditoría. Los nodos todavía sin backend (grupos, asistencia, cuotas e integraciones) se muestran bloqueados, no simulados. El CRM requiere `KIRA_CRM_PII_ENCRYPTION_KEY` como variable sensible server-only (32 bytes base64 o 64 caracteres hex).

Estos documentos distinguen funcionalidades existentes, parciales y planificadas; una especificación no implica que una ruta esté implementada ni desplegada.
