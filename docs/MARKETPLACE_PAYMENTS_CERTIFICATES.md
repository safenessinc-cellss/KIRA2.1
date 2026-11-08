# KIRA Marketplace, Pagamentos, Certificados e Dashboards

**Desenvolvimento:** SAFENESS.INC  
**Branch:** `feat/kira-marketplace-certificates-payments`

## Requisitos funcionais

### 1. Responsive-first
- Aplicação usável em mobile (320px+), tablet e desktop.
- Navegação lateral desktop transforma-se em drawer/tabbar mobile; tabelas viram cards ou scroll acessível.
- Formulários de curso, checkout, certificados e dashboards não podem exigir hover.
- Estados de loading, empty, error, success e offline claros.
- Layouts responsivos para landing, marketplace, curso, checkout, aluno, coach e superadmin.

### 2. Marketplace e checkout central KIRA
- Coach aprovado cria cursos, livros, mentorias e produtos; drafts não são listados publicamente.
- Preço, moeda, desconto, taxa e split são calculados exclusivamente no backend.
- Aluno inicia checkout hospedado pelo provedor (Stripe ou outro habilitado); nunca armazenar cartão/CVV.
- Pagamento fica pending até webhook de provedor autenticado, validado e idempotente.
- Somente webhook verificado pode marcar order/payment paid e liberar enrollment/entitlement.
- Eventos: checkout_started, payment_pending, payment_succeeded, payment_failed, refund_requested, refund_succeeded, chargeback, payout_requested, payout_paid.
- Refund/chargeback revoga entitlement e certificado de acordo com política e registra evento financeiro.
- Não utilizar mock checkout nem simular pagamento como concluído.

### 3. Emissão de certificados (gated por pagamento)
- Coach pode solicitar/emitir certificado apenas para aluno elegível: enrollment ativo, curso concluído segundo regra do curso e order/payment confirmado.
- Certificado é emitido server-side; frontend não pode criar nem alterar status/serial.
- Antes da emissão, mostrar ao coach nome do aluno, curso, carga horária, data, pedido e status de pagamento.
- Certificado com serial único, QR/URL de verificação pública, KIRA branding, nome/logo coach, curso, aluno, carga horária, data, watermark.
- Estados: eligible, issued, revoked, replaced. Revogação/reemissão gera trilha de auditoria.
- Solicitação/ emissão gera evento e aparece imediatamente no painel de Superadmin.
- Verificação pública retorna somente dados mínimos: validade, nome do aluno (ou opção privacy-preserving), curso, coach, data e serial; nunca e-mail/PII privada.
- Se houver reembolso integral/chargeback, suspender ou revogar certificado conforme política e notificar coach/admin/aluno.

### 4. Dashboards e relatórios tipo marketplace
**Coach dashboard (apenas dados próprios):**
- alunos vinculados, inscrições, conclusão, certificados, pedidos, gross sales, comissão KIRA, fees de pagamento, refunds, net earnings, saldo pendente/available, payout status.
- filtros por data, curso, aluno, status, moeda; exportação CSV.
- timeline por aluno: matrícula -> pagamento -> progresso -> conclusão -> certificado.
- coach só enxerga seus cursos, alunos inscritos e vendas atribuídas a seus produtos.

**Aluno dashboard:**
- compras, recibos/pedidos, cursos e progresso, certificados emitidos/verificáveis, refund status.

**Superadmin dashboard:**
- visão global: vendas brutas, receita KIRA, taxas de processador, valor de coaches, refunds, chargebacks, pagamentos pendentes, payouts, cursos, coaches, alunos e certificados.
- fila de certificados emitidos/solicitados e estado de pagamento relacionado.
- gestão de coaches, cursos, comissão por produto/coach, pedidos, refunds e payouts.
- filtros por data/coach/curso/estado; exportações e audit log.
- painel administrativo não deve depender de dados ou métricas agregadas calculadas pelo cliente.

### 5. Modelo de dados sugerido
- `orders/{orderId}`: buyerUid, coachUid, productId, currency, subtotal, discount, tax, platformFee, processorFee, coachNet, status, createdAt, paidAt, refundState, provider.
- `paymentEvents/{eventId}`: providerEventId unique, orderId, type, amount, currency, verified, processedAt; idempotência e imutabilidade.
- `entitlements/{id}`: buyerUid, productId, orderId, grantedAt, status.
- `certificates/{certificateId}`: serial, studentUid, coachUid, courseId, orderId, paymentStatus, issueStatus, issuedAt, revokedAt, verificationToken, audit references.
- `ledgerEntries/{entryId}`: orderId, eventType, gross, platformFee, processorFee, coachNet, currency, immutable, createdAt.
- `payouts/{payoutId}`: coachUid, amount, currency, status, providerTransferId, createdAt, paidAt.
- `auditLogs/{id}`: actorUid, action, entityType, entityId, timestamp, metadata sanitized.

### 6. Authorization / security
- Roles: superadmin, coach (approved), student.
- Superadmin-only settings, platform totals, commission, payout/refund operations.
- Coach cannot self-approve or modify role/commission/payment/certificate validity.
- Student cannot write payment confirmation, entitlement, ledger, certificate status, or payout.
- Use Firebase Auth + server-verified identity and authorization. Firestore client rules deny writes to sensitive finance/payment/certificate collections; server uses Admin SDK and least privilege.
- Do not use email string checks or frontend guards as sole admin authorization.
- No sensitive payment secrets in VITE_* or browser bundle.

### 7. Definition of done
- Test payment success/failure, duplicate webhook, invalid signature, refund, chargeback, course completion gate, unpaid certificate attempt, coach cross-tenant access, student entitlement manipulation, and superadmin reporting.
- Confirm responsive behavior at 320, 768, 1024, 1440px.
- No production release until provider secrets/webhooks and security rules are configured and QA passes.
