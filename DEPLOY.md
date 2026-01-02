# Deploy da API AECAC na Vercel

## 📋 Pré-requisitos

1. Conta no Vercel
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. MongoDB Atlas ou instância MongoDB configurada

## 🚀 Passo a Passo

### 1. Conectar o Repositório ao Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em "Add New Project"
3. Importe o repositório `api-aecac`
4. O Vercel detectará automaticamente que é um projeto Next.js

### 2. Configurar Variáveis de Ambiente

No painel do projeto no Vercel:

1. Vá em **Settings** → **Environment Variables**
2. Adicione as seguintes variáveis:

```
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/aecac
JWT_SECRET=sua-chave-secreta-super-segura-aqui
```

**Importante:**
- `MONGODB_URI`: URI de conexão do seu MongoDB (MongoDB Atlas ou outra instância)
- `JWT_SECRET`: Uma string aleatória segura para assinar os tokens JWT (use um gerador de senhas seguras)

### 3. Configurações do Projeto

O Vercel deve detectar automaticamente:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (ou `next build`)
- **Output Directory**: `.next` (gerenciado automaticamente pelo Next.js)
- **Install Command**: `npm install`

### 4. Deploy

1. Clique em **Deploy**
2. Aguarde o build completar
3. Após o deploy, você receberá uma URL como: `https://api-aecac-xxx.vercel.app`

### 5. Criar Usuário Admin

Após o deploy, você precisa criar o primeiro usuário admin. Você pode:

**Opção 1: Usar o script local**
```bash
node scripts/createAdmin.mjs
```

**Opção 2: Criar diretamente no MongoDB**
```json
{
  "email": "admin@aecac.org.br",
  "password": "<hash_bcrypt_da_senha>",
  "name": "Administrador",
  "role": "admin"
}
```

## 🔗 Configurar Frontend

Após o deploy da API, configure a variável de ambiente no projeto frontend:

1. No projeto frontend (`fn-aecac`), vá em **Settings** → **Environment Variables**
2. Adicione:
```
VITE_API_URL=https://api-aecac-xxx.vercel.app/api
```

Substitua `api-aecac-xxx.vercel.app` pela URL real da sua API.

## ✅ Verificação

Após o deploy, teste se a API está funcionando:

```bash
curl https://api-aecac-xxx.vercel.app/api/sobre
```

Deve retornar um JSON com os dados ou um objeto vazio.

## 📝 Notas

- O Vercel detecta automaticamente o Next.js e configura tudo
- Não é necessário configurar `vercel.json` manualmente (já está configurado)
- As rotas da API estarão disponíveis em `/api/*`
- O CORS já está configurado para aceitar requisições de qualquer origem

