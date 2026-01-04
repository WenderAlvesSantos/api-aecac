# 📧 Configuração do SendGrid para AECAC

## 🚀 Passo a Passo

### 1. Criar Conta no SendGrid

1. Acesse: https://sendgrid.com
2. Clique em "Start for Free"
3. Preencha os dados e crie sua conta
4. Verifique seu email

### 2. Criar API Key

1. No dashboard do SendGrid, vá em **Settings** → **API Keys**
2. Clique em **Create API Key**
3. Dê um nome (ex: "AECAC Production")
4. Selecione **Full Access** ou **Restricted Access** (recomendado: Restricted Access com permissões de Mail Send)
5. Clique em **Create & View**
6. **IMPORTANTE**: Copie a API Key imediatamente (ela só aparece uma vez!)
   - Formato: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Verificar Remetente (Sender)

1. No SendGrid, vá em **Settings** → **Sender Authentication**
2. Clique em **Verify a Single Sender**
3. Preencha os dados:
   - **From Email Address**: O email que será usado como remetente (ex: noreply@aecac.com.br)
   - **From Name**: AECAC
   - **Reply To**: Seu email de contato
   - **Company Address**: Endereço da AECAC
4. Verifique o email enviado pelo SendGrid
5. Após verificação, você poderá enviar emails

### 4. Configurar Variáveis de Ambiente

Adicione no arquivo `.env.local` do projeto `api-aecac`:

```env
# SendGrid Configuration
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.sua-api-key-aqui
EMAIL_FROM=noreply@aecac.com.br
FRONTEND_URL=https://seu-site.com
```

**⚠️ IMPORTANTE:**
- Substitua `SG.sua-api-key-aqui` pela API Key real que você copiou
- Substitua `noreply@aecac.com.br` pelo email verificado no SendGrid
- Substitua `https://seu-site.com` pela URL do seu frontend

### 5. Testar

1. Reinicie o servidor: `npm run dev`
2. Aprove uma empresa no admin
3. Verifique se o email foi enviado
4. Verifique a caixa de entrada (e spam) do email da empresa

## 📊 Monitoramento

No dashboard do SendGrid você pode:
- Ver estatísticas de envio
- Ver emails enviados
- Verificar bounces e spam reports
- Configurar webhooks para eventos

## 🔒 Segurança

- **NUNCA** commite a API Key no Git
- Use variáveis de ambiente
- Para produção no Vercel, adicione as variáveis em:
  - Vercel Dashboard → Seu Projeto → Settings → Environment Variables

## ✅ Checklist

- [ ] Conta criada no SendGrid
- [ ] API Key criada e copiada
- [ ] Remetente verificado
- [ ] Variáveis de ambiente configuradas
- [ ] Servidor reiniciado
- [ ] Teste de envio realizado

## 🆘 Troubleshooting

### Email não está sendo enviado

1. Verifique se `EMAIL_SERVICE=sendgrid` está configurado
2. Verifique se a API Key está correta (começa com `SG.`)
3. Verifique se o remetente está verificado no SendGrid
4. Verifique os logs do servidor para erros
5. Verifique o dashboard do SendGrid para ver se há erros

### Erro de autenticação

- Certifique-se de que a API Key está correta
- Verifique se não há espaços extras na API Key
- Certifique-se de que o usuário é `apikey` (não altere isso)

### Emails indo para spam

- Verifique o remetente no SendGrid
- Configure SPF e DKIM (SendGrid faz isso automaticamente)
- Use um domínio verificado (Domain Authentication) para melhor deliverability

## 📚 Recursos

- Documentação SendGrid: https://docs.sendgrid.com
- Guia de API Keys: https://docs.sendgrid.com/ui/account-and-settings/api-keys
- Guia de Sender Authentication: https://docs.sendgrid.com/ui/sending-email/sender-verification

