# AECAC API

Backend Next.js para o site da AECAC com MongoDB.

## 🚀 Configuração

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` e adicione:
- `MONGODB_URI`: URI de conexão do MongoDB
- `JWT_SECRET`: Chave secreta para JWT (use uma string aleatória segura)

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

A API estará disponível em `http://localhost:3000/api`

## 📡 Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registrar novo usuário (requer autenticação)

### Eventos
- `GET /api/eventos` - Listar eventos
- `POST /api/eventos` - Criar evento (requer autenticação)
- `GET /api/eventos/[id]` - Buscar evento
- `PUT /api/eventos/[id]` - Atualizar evento (requer autenticação)
- `DELETE /api/eventos/[id]` - Deletar evento (requer autenticação)

### Parceiros
- `GET /api/parceiros` - Listar parceiros
- `POST /api/parceiros` - Criar parceiro (requer autenticação)
- `GET /api/parceiros/[id]` - Buscar parceiro
- `PUT /api/parceiros/[id]` - Atualizar parceiro (requer autenticação)
- `DELETE /api/parceiros/[id]` - Deletar parceiro (requer autenticação)

### Empresas
- `GET /api/empresas` - Listar empresas
- `POST /api/empresas` - Criar empresa (requer autenticação)
- `GET /api/empresas/[id]` - Buscar empresa
- `PUT /api/empresas/[id]` - Atualizar empresa (requer autenticação)
- `DELETE /api/empresas/[id]` - Deletar empresa (requer autenticação)

### Galeria
- `GET /api/galeria` - Listar imagens
- `POST /api/galeria` - Criar imagem (requer autenticação)
- `GET /api/galeria/[id]` - Buscar imagem
- `PUT /api/galeria/[id]` - Atualizar imagem (requer autenticação)
- `DELETE /api/galeria/[id]` - Deletar imagem (requer autenticação)

### Diretoria
- `GET /api/diretoria` - Listar membros
- `POST /api/diretoria` - Criar membro (requer autenticação)
- `GET /api/diretoria/[id]` - Buscar membro
- `PUT /api/diretoria/[id]` - Atualizar membro (requer autenticação)
- `DELETE /api/diretoria/[id]` - Deletar membro (requer autenticação)

### Sobre
- `GET /api/sobre` - Buscar informações sobre
- `PUT /api/sobre` - Atualizar informações (requer autenticação)

## 🔐 Autenticação

Para endpoints que requerem autenticação, inclua o header:
```
Authorization: Bearer <token>
```

O token é obtido através do endpoint `/api/auth/login`.

## 🌐 Deploy na Vercel

Veja instruções detalhadas em [DEPLOY.md](./DEPLOY.md).

**Resumo:**
1. Conecte seu repositório à Vercel
2. Configure as variáveis de ambiente na Vercel:
   - `MONGODB_URI`: URI de conexão do MongoDB
   - `JWT_SECRET`: Chave secreta para JWT (use uma string aleatória segura)
3. O Vercel detectará automaticamente que é um projeto Next.js
4. Após o deploy, configure a URL da API no projeto frontend

## 📝 Notas

- O banco de dados MongoDB deve ter uma coleção `users` para autenticação
- Para criar o primeiro usuário admin, você pode usar o endpoint `/api/auth/register` (requer autenticação) ou criar diretamente no MongoDB
- Certifique-se de usar um JWT_SECRET forte em produção

