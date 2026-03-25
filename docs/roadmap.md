# Roadmap — TiBum SaaS

## Status Atual: MVP v4 ✅

Multi-tenant completo, RBAC, billing estrutural, audit logs, super admin, convite por email.

---

## ✅ Concluído

### v2 — SaaS Multi-tenant
- [x] Arquitetura multi-tenant com workspaces e RLS
- [x] RBAC: roles admin e technician
- [x] Planos de assinatura (Gratuito / Starter / Pro)
- [x] Trial de 14 dias automático
- [x] Audit logs de todas as ações
- [x] Onboarding de criação de empresa

### v3 — Super Admin
- [x] Painel exclusivo do criador em `/super-admin`
- [x] Bloqueio/desbloqueio de empresas com motivo
- [x] Exclusão de empresa (cascade + libera slug)
- [x] Troca manual de plano pelo super admin
- [x] Página `/bloqueado` com mensagem de motivo

### v4 — Contatos e Convites
- [x] Dados de contato do admin (email + WhatsApp) no onboarding
- [x] Popup de detalhes da empresa no painel super admin
- [x] Convite de membros por nome + email (sem UUID do Supabase)
- [x] Email automático de acesso enviado ao técnico convidado

---

## v2.1 — Estabilização (próximo)

- [ ] **Paginação** — listas com muitos registros (clientes, serviços, logs)
- [ ] **Busca global** — encontrar qualquer cliente ou serviço rapidamente
- [ ] **Filtro de data** — agenda e serviços filtráveis por período
- [ ] **Toasts de feedback** — substituir `alert()` por notificações visuais
- [ ] **Loading skeletons** — UX mais polida durante carregamento

---

## v2.2 — WhatsApp

- [ ] **Integração Z-API / Twilio** — plug-in em `src/lib/whatsapp.ts`
- [ ] **Lembretes automáticos** — agendamento D-1 via cron job (Vercel Cron)
- [ ] **Confirmação de serviço** — técnico confirma via WhatsApp
- [ ] **Cobrança via WhatsApp** — mensagem de pagamento pendente

---

## v2.3 — Billing real

- [ ] **Stripe integration** — checkout e gestão de assinatura
- [ ] **Webhook Stripe** — atualizar `subscriptions.status` automaticamente
- [ ] **Portal do cliente Stripe** — cancelamento e troca de plano self-service
- [ ] **Limite enforcement** — bloquear criação quando limite do plano é atingido

---

## v3.0 — Produto Completo

- [ ] **Relatórios** — PDF mensal de serviços por cliente
- [ ] **App mobile** — React Native ou PWA com offline support
- [ ] **Histórico do cliente** — linha do tempo de todos os serviços e produtos
- [ ] **Estoque** — controle de produtos químicos
- [ ] **Rota do dia** — otimização de visitas para o técnico
- [ ] **Fotos no serviço** — upload direto (Supabase Storage)
- [ ] **API pública** — integração com outros sistemas (ERPs, lojas)

---

## v3.x — SaaS Maduro

- [ ] **White-label** — empresa pode usar com sua própria marca
- [ ] **Multi-idioma** — espanhol (expansão LATAM)
- [ ] **SSO** — login com Google/Microsoft
- [ ] **2FA** — segurança adicional para admins
- [ ] **SLA e uptime** — monitoramento e status page

---

## Backlog Técnico

- [ ] Testes automatizados (Playwright E2E)
- [ ] Testes unitários dos services
- [ ] CI/CD com GitHub Actions
- [ ] Preview deployments por branch
- [ ] Monitoramento de erros (Sentry)
- [ ] Análise de performance (Vercel Analytics)
- [ ] Migrações SQL versionadas (supabase CLI)
- [ ] Rate limiting nas rotas sensíveis

---

## Como Priorizar

```
Impacto alto + Esforço baixo  → FAZER AGORA
Impacto alto + Esforço alto   → PLANEJAR
Impacto baixo + Esforço baixo → BACKLOG
Impacto baixo + Esforço alto  → DESCARTAR
```

**Próximo foco recomendado:** v2.1 (estabilização) → v2.3 (billing real) → v2.2 (WhatsApp)

O billing real é crítico para a viabilidade do negócio antes de investir em features.
