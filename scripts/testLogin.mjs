// Script para testar login diretamente
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
config({ path: join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI
const TEST_EMAIL = process.argv[2] || 'admin@aecac.org.br'
const TEST_PASSWORD = process.argv[3] || 'admin123'

if (!MONGODB_URI) {
  console.error('❌ Erro: MONGODB_URI não encontrada no .env.local')
  process.exit(1)
}

async function testLogin() {
  let client
  try {
    console.log('🔌 Conectando ao MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const db = client.db('aecac')
    const usersCollection = db.collection('users')
    
    const normalizedEmail = TEST_EMAIL.trim().toLowerCase()
    console.log(`\n🔍 Buscando usuário com email: ${normalizedEmail}`)
    
    const user = await usersCollection.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
    })
    
    if (!user) {
      console.log('❌ Usuário não encontrado!')
      const allUsers = await usersCollection.find({}).toArray()
      console.log('\n📋 Usuários no banco:')
      allUsers.forEach(u => console.log(`  - ${u.email}`))
      await client.close()
      return
    }
    
    console.log('✅ Usuário encontrado:')
    console.log(`   ID: ${user._id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Nome: ${user.name}`)
    
    console.log(`\n🔐 Testando senha: "${TEST_PASSWORD}"`)
    const isValid = await bcrypt.compare(TEST_PASSWORD, user.password)
    
    if (isValid) {
      console.log('✅ Senha válida! Login funcionaria.')
    } else {
      console.log('❌ Senha inválida!')
      console.log(`\n💡 Dica: Verifique se a senha está correta.`)
      console.log(`   Para criar um novo usuário, execute:`)
      console.log(`   node scripts/createAdmin.mjs`)
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

testLogin()

