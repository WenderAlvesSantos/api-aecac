# 📧 Configuração de Email

Este documento explica como configurar o envio de emails no sistema AECAC.

## 📋 Opções de Configuração

O sistema suporta múltiplos provedores de email. Escolha uma das opções abaixo:

### 1. Gmail (Recomendado para testes)

**Opção A: Senha de App (Mais simples)**

Adicione no `.env.local`:

```env
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=sua-senha-de-app
EMAIL_FROM=seu-email@gmail.com
FRONTEND_URL=https://seu-site.com
```

**Como obter senha de app do Gmail:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "App" e "Mail"
3. Selecione "Outro (nome personalizado)" e digite "AECAC"
4. Clique em "Gerar"
5. Copie a senha gerada (16 caracteres)

**Opção B: OAuth2 (Mais seguro, para produção)**

```env
GMAIL_USER=seu-email@gmail.com
GMAIL_CLIENT_ID=seu-client-id
GMAIL_CLIENT_SECRET=seu-client-secret
GMAIL_REFRESH_TOKEN=seu-refresh-token
EMAIL_FROM=seu-email@gmail.com
FRONTEND_URL=https://seu-site.com
```

### 2. SendGrid (Recomendado para produção) ⭐

**📖 Guia Completo:** Veja `SENDGRID_SETUP.md` para instruções detalhadas.

**Configuração rápida:**

1. Crie uma conta em https://sendgrid.com
2. Gere uma API Key em **Settings** → **API Keys**
3. Verifique um remetente em **Settings** → **Sender Authentication**
4. Adicione no `.env.local`:

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.sua-api-key-aqui
EMAIL_FROM=noreply@aecac.com.br
FRONTEND_URL=https://seu-site.com
```

**⚠️ IMPORTANTE:**
- A API Key começa com `SG.` e tem cerca de 70 caracteres
- O email em `EMAIL_FROM` deve ser verificado no SendGrid
- Copie a API Key imediatamente (ela só aparece uma vez!)

### 3. Resend (Moderno e simples)

1. Crie uma conta em https://resend.com
2. Gere uma API Key
3. Adicione no `.env.local`:

```env
EMAIL_SERVICE=resend
RESEND_API_KEY=re_sua-api-key-aqui
EMAIL_FROM=noreply@seu-dominio.com
FRONTEND_URL=https://seu-site.com
```

### 4. SMTP Customizado (Qualquer provedor)

```env
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-usuario
SMTP_PASS=sua-senha
EMAIL_FROM=noreply@seu-dominio.com
FRONTEND_URL=https://seu-site.com
```

## 🔧 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `EMAIL_FROM` | Email remetente | Sim |
| `FRONTEND_URL` | URL do frontend (para links nos emails) | Sim |
| `GMAIL_USER` | Email do Gmail | Se usar Gmail |
| `GMAIL_APP_PASSWORD` | Senha de app do Gmail | Se usar Gmail |
| `SENDGRID_API_KEY` | API Key do SendGrid | Se usar SendGrid |
| `RESEND_API_KEY` | API Key do Resend | Se usar Resend |
| `SMTP_HOST` | Host SMTP | Se usar SMTP customizado |
| `SMTP_PORT` | Porta SMTP | Se usar SMTP customizado |
| `SMTP_USER` | Usuário SMTP | Se usar SMTP customizado |
| `SMTP_PASS` | Senha SMTP | Se usar SMTP customizado |

## 📨 Emails Enviados

O sistema envia automaticamente:

1. **Email de Aprovação**: Quando uma empresa é aprovada pelo admin
2. **Email de Boas-vindas**: Quando um associado cria sua conta
3. **Email de Rejeição**: Quando uma empresa é rejeitada (opcional)

## 🧪 Modo Desenvolvimento

Se nenhuma configuração de email for fornecida, o sistema entrará em "modo desenvolvimento" e apenas logará os emails no console, sem enviá-los realmente.

## ✅ Testando

Para testar o envio de emails:

1. Configure as variáveis de ambiente
2. Aprove uma empresa no admin
3. Verifique se o email foi enviado
4. Registre um novo associado
5. Verifique se o email de boas-vindas foi enviado

## 🔒 Segurança

- **NUNCA** commite o arquivo `.env.local` no Git
- Use senhas de app ou OAuth2, nunca senhas normais
- Para produção, use serviços profissionais como SendGrid ou Resend

