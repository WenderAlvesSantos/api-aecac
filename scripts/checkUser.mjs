// Script para verificar usuários no banco
import { MongoClient } from 'mongodb'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
config({ path: join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ Erro: MONGODB_URI não encontrada no .env.local')
  process.exit(1)
}

async function checkUsers() {
  let client
  try {
    console.log('🔌 Conectando ao MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const db = client.db('aecac')
    const usersCollection = db.collection('users')
    
    const users = await usersCollection.find({}).toArray()
    
    if (users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado no banco de dados!')
      console.log('Execute: node scripts/createAdmin.mjs')
    } else {
      console.log(`\n✅ Encontrados ${users.length} usuário(s):\n`)
      users.forEach((user, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`Usuário ${index + 1}:`)
        console.log(`  ID: ${user._id}`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Nome: ${user.name || 'N/A'}`)
        console.log(`  Senha (hash): ${user.password.substring(0, 20)}...`)
        console.log(`  Criado em: ${user.createdAt || 'N/A'}`)
      })
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
    }
    
    await client.close()
  } catch (error) {
    console.error('❌ Erro:', error.message)
    if (client) {
      await client.close()
    }
    process.exit(1)
  }
}

checkUsers()

