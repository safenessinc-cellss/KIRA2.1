# KIRA 2.1 — Integral Product Scope and Dashboard Navigation

## Product objective

Evolve the existing KIRA 2.1 application into the complete four-portal ecosystem described in the Integral KIRA 2.1 narrative, while preserving every existing working capability. This is an additive integration program, not a rewrite.

**Source of truth:** the existing application, its routes, Firebase data model, role permissions, security rules, existing PRs and this scope document. Existing functionality must be reused where it already satisfies a requirement.

## Non-negotiable preservation rules

1. Do not remove a working feature merely to simplify navigation or redesign the UI.
2. Before adding a module, inspect existing routes, tabs, components, API endpoints, Firestore collections and permissions. Reuse or extend the existing implementation.
3. One capability must have one canonical menu destination. If a feature already exists inside a broader module, link to that destination instead of adding a second menu item.
4. Do not show fake metrics, fabricated activity, demo writes, or success messages for actions that did not complete.
5. Keep the current React + Vite + TypeScript frontend, Express/Node backend and Firebase/Firestore architecture. Do not migrate the database.
6. Keep all private API keys and provider secrets on the server. Never put secrets in VITE_ variables or client bundles.
7. Keep student journals, session transcripts and identifiable wellbeing information private. HR receives only aggregated, threshold-protected reports.
8. Do not deploy production, run migrations, issue refunds or trigger real payments as part of UI work. Production changes require all release gates and explicit owner approval.

## Dashboard and navigation design

### Interaction model

- Keep a persistent module launcher on the left and the selected module's page in the right-hand content panel on desktop.
- Selecting a module changes the right-hand page; it must not append the page underneath the Dashboard.
- Preserve direct routes, browser back/forward, active-module state, authorization guards and deep links.
- On mobile and tablet, adapt the launcher to a compact, accessible grid/drawer without horizontal overflow.
- The launcher uses Apple/macOS/iOS-inspired app tiles: rounded blocks, clear icons, concise labels, subtle translucency, consistent spacing, restrained shadows and visible focus/selected states.
- Maintain KIRA brand identity and dynamic theme variables. Apple is a visual interaction reference, not a request to copy proprietary artwork.
- Keep account, notifications, cart (where applicable), profile and logout actions available without duplicating them inside module navigation.

### Canonical portal groups

**Student / Collaborator**
- Inicio / Mi aprendizaje
- Bienestar: check-in emocional, diario inteligente, ejercicios somáticos/arteterapia
- Aprendizaje: microlearning, cursos y progreso
- Biblioteca: Elite Library
- Comunidad
- Mi perfil y preferencias

**Coach / Mentor**
- Centro de mando
- Alumnos y CRM
- Sesiones: Session Intelligence
- Cursos y contenidos
- Analítica e impacto
- Coach Chat / seguimiento
- Perfil profesional

**Corporate HR**
- Resumen organizacional
- Bienestar agregado
- Alertas preventivas
- Personas y departamentos
- Licencias corporativas
- Informes ejecutivos

**Global Administrator**
- Resumen ejecutivo
- Personas y aprobaciones
- Academia y certificados
- Marketplace y contenidos
- Finanzas y liquidaciones
- Empresas y licencias B2B
- Seguridad, roles y auditoría
- Branding y configuración
- Integraciones y operaciones

The lists above define destinations, not permission bypasses. Render only destinations allowed for the authenticated role and staff permission set. Avoid duplicate destinations such as separate menu entries for two labels that open the same tab/route; group related actions within one canonical module.

## Functional scope from the Integral KIRA narrative

### Student wellbeing
- Daily emotional check-in with energy/clarity scales and auditable Energy Points rules.
- Private guided journaling with contextual Gemini reflection and clear consent.
- Art therapy and somatic exercises with downloadable guides.
- Five-minute microlearning, including breathing, cognitive reframing and habits.
- Curated Elite Library for audio, meditations and reading resources.
- Moderated public or anonymous community participation.
- Context-aware Kira AI assistant that knows current route, role and allowed context.

### Coach workspace
- Live browser microphone transcription with explicit participant consent and visible recording state.
- Coach/client speaker labeling with manual correction.
- Live insights panel and contextual Socratic prompts.
- Session completion workflow producing summary, clarity/energy observations, commitments and next-session recommendations.
- Manual notes/transcript import using the same consent, privacy and retention policy.
- Course/program authoring, delivery and monetization.
- Client chat, history, retention and impact analytics.
- Exportable professional session PDF.

### HR B2B
- Tenant-isolated organization and department dashboards.
- Aggregated wellbeing and culture indicators only; suppress groups below a privacy threshold.
- Early-warning trends presented as non-diagnostic support signals, not employee-level medical or psychological labels.
- Corporate seat/license provisioning and utilization.
- Quarterly executive PDF reports and documented methodology.

### Global administration
- Role and scope permissions, MFA for sensitive owner operations and immutable audit events.
- Coach and credential approval.
- Tenant/brand configuration propagated consistently across all portals.
- Finance, payment status, ledger and reconciliation.
- Operational health and integration status without exposing secrets.

### Roadmap integrations
- Coach booking pages and Google/Outlook/Cal.com calendar sync.
- Embedded video sessions using an approved WebRTC provider.
- Session and HR PDF exports.
- Optional wearable integrations only after explicit user consent and data minimization.
- Bidirectional natural voice using Gemini Live or an approved equivalent.
- Installable PWA with carefully scoped offline support for drafts and approved media.

## Quality and release gates

A feature is complete only when its UI, backend/API, persistence, authorization, error states, accessibility and automated tests are connected.

Required release checks:
1. TypeScript and lint pass.
2. Production build passes.
3. Firestore rules tests pass in Emulator.
4. Role matrix tests cover student, coach, HR/company admin, staff admin and superadmin.
5. End-to-end tests cover the principal journeys for all four portals.
6. Privacy tests prove HR cannot read individual journals or session transcripts.
7. Payment/webhook tests use provider sandbox and verify signature, idempotency and ledger consistency.
8. Responsive visual checks cover phone, tablet and desktop.
9. Preview is READY for the exact tested commit.
10. Production promotion occurs only after blockers are closed, rollback is prepared and the owner approves.

## Current UI slice

The first implementation slice in `feat/kira-apple-block-dashboard-navigation` changes the non-admin role launcher into an Apple-inspired tile grid while retaining the existing right-side `Outlet` content panel, routes, auth, notifications, cart, profile, themes and logout. It does not claim that the full product scope or every portal feature is complete.
