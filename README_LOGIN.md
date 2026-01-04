# 🔍 Diagnóstico de Problemas de Login

## Problema: Não consigo fazer login com usuário existente

### Possíveis Causas:

1. **Senha não está hashada corretamente**
   - Usuários antigos podem ter senhas em texto plano
   - Solução: Redefinir a senha usando o script `resetPassword.mjs`

2. **Email não normalizado**
   - O email no banco pode ter maiúsculas/minúsculas diferentes
   - Solução: O sistema agora normaliza automaticamente

3. **JWT_SECRET mudou**
   - Se o JWT_SECRET foi alterado, tokens antigos não funcionam
   - Solução: Fazer logout e login novamente

## 🔧 Como Diagnosticar:

### 1. Verificar usuários no banco:

```bash
cd api-aecac
node scripts/checkUser.mjs
```

Este script mostra:
- Todos os usuários cadastrados
- Se a senha está hashada corretamente
- Email de cada usuário

### 2. Redefinir senha de um usuário:

```bash
cd api-aecac
node scripts/resetPassword.mjs
```

Este script permite:
- Escolher um usuário pelo email
- Definir uma nova senha (será hashada automaticamente)

## 📝 Logs do Sistema

O sistema de login agora gera logs detalhados. Verifique os logs do servidor quando tentar fazer login para ver:
- Se o usuário foi encontrado
- Se a senha está hashada corretamente
- Se a validação de senha passou ou falhou

## ⚠️ Mensagens de Erro Comuns:

- **"Credenciais inválidas"**: Email ou senha incorretos
- **"Usuário sem senha cadastrada"**: Senha não está hashada - use `resetPassword.mjs`
- **"Senha do usuário precisa ser redefinida"**: Senha não está no formato bcrypt - use `resetPassword.mjs`

## ✅ Solução Rápida:

Se você sabe o email do usuário, execute:

```bash
cd api-aecac
node scripts/resetPassword.mjs
```

Digite o email e uma nova senha. O sistema irá:
1. Encontrar o usuário
2. Hashar a nova senha com bcrypt
3. Atualizar no banco de dados

Depois disso, você poderá fazer login normalmente.

