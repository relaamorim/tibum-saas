# Visão do Produto — TiBum SaaS

## O Problema

Empresas de manutenção de piscinas e lojas do setor gerenciam seus negócios com planilhas, papel ou WhatsApp. Isso gera:

- Agendamentos perdidos ou duplicados
- Histórico de serviços inacessível
- Controle financeiro impreciso
- Dificuldade em escalar a equipe de técnicos

---

## A Solução

**TiBum** é um SaaS vertical para o setor de piscinas que oferece:

1. **Agenda inteligente** — agendamentos recorrentes com histórico completo
2. **Registro de serviços** — o que foi feito, quais produtos, com foto
3. **Controle financeiro** — o que foi cobrado e o que está pendente
4. **Gestão de equipe** — admins e técnicos com permissões diferentes
5. **Multi-empresa** — cada empresa tem seus dados isolados (SaaS pronto para escalar)

---

## Personas

### 🧑‍💼 João — Dono de empresa de manutenção
- 15 clientes fixos, 2 técnicos
- Precisa saber quem recebeu e quem não recebeu no mês
- Quer enviar lembrete de manutenção automaticamente
- **Usa:** módulo financeiro, agenda, configurações

### 🔧 Carlos — Técnico de campo
- Chega no cliente, faz o serviço, registra produtos
- Precisa ver a agenda do dia no celular
- Não precisa ver financeiro
- **Usa:** agenda, serviços (role: technician)

### 🏪 Ana — Dona de loja de piscinas
- Vende produtos e faz manutenção
- Quer histórico do cliente para vender produtos certos
- **Usa:** clientes, histórico de serviços

---

## Jornada do Usuário

```
1. Cadastro → 2. Onboarding (criar empresa) → 3. Trial 14 dias
       ↓
4. Cadastrar clientes
       ↓
5. Criar agendamentos recorrentes
       ↓
6. Técnico conclui agendamento → serviço registrado automaticamente
       ↓
7. Pagamento gerado como "pendente"
       ↓
8. Admin marca como pago
       ↓
9. Dashboard mostra resumo do mês
```

---

## Diferenciais do TiBum

| Diferencial | Descrição |
|---|---|
| **Vertical** | Feito exclusivamente para piscinas (tipos, tamanhos, produtos) |
| **Multi-tenant** | Uma instância para N empresas — SaaS escalável |
| **RBAC real** | Técnicos não veem financeiro; admins controlam tudo |
| **Audit trail** | Toda ação registrada — essencial para empresas sérias |
| **Notificações** | Estrutura pronta para WhatsApp (canal principal do setor) |

---

## Modelo de Negócio

### Receita
- Assinatura mensal por workspace (empresa)
- Trial de 14 dias sem cartão

### Custos
- Supabase: ~$25/mês (até 50k usuários ativos)
- Vercel: $0 (hobby) ou $20/mês (pro)
- Margem alta a partir de 10 clientes pagantes

### Crescimento
- Boca a boca entre empresas do setor
- Parceria com distribuidores de produtos químicos
- Expansão para outros países LATAM (modelo multi-idioma futuro)

---

## Métricas de Sucesso (KPIs)

| Métrica | Descrição |
|---|---|
| MRR | Receita mensal recorrente |
| Churn | % de workspaces cancelados por mês |
| DAU | Usuários ativos por dia |
| Serviços registrados | Volume de uso real |
| NPS | Satisfação dos usuários |
