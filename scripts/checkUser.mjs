import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não encontrada no .env.local')
  process.exit(1)
}

async function checkUser() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Conectado ao MongoDB')
    
    const db = client.db('aecac')
    const users = await db.collection('users').find({}).toArray()
    
    console.log(`\n📊 Total de usuários encontrados: ${users.length}\n`)
    
    users.forEach((user, index) => {
      console.log(`\n--- Usuário ${index + 1} ---`)
      console.log(`ID: ${user._id}`)
      console.log(`Email: ${user.email}`)
      console.log(`Nome: ${user.name || 'N/A'}`)
      console.log(`Senha (hash): ${user.password ? user.password.substring(0, 30) + '...' : 'NÃO TEM SENHA'}`)
      console.log(`Senha é hash bcrypt: ${user.password?.startsWith('$2a$') || user.password?.startsWith('$2b$') || user.password?.startsWith('$2y$') ? 'SIM ✅' : 'NÃO ❌'}`)
      console.log(`Criado em: ${user.createdAt || 'N/A'}`)
    })
    
    // Verificar se há usuários sem senha hashada
    const usersWithoutHash = users.filter(u => !u.password?.startsWith('$2'))
    if (usersWithoutHash.length > 0) {
      console.log(`\n⚠️  ATENÇÃO: ${usersWithoutHash.length} usuário(s) sem senha hashada!`)
      console.log('Esses usuários precisam ter a senha redefinida.')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await client.close()
  }
}

checkUser()
