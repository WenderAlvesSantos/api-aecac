// Script para criar o primeiro usuário admin
// Execute: node scripts/createAdmin.mjs

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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aecac.org.br'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrador'

if (!MONGODB_URI) {
  console.error('❌ Erro: MONGODB_URI não encontrada no .env.local')
  console.log('Por favor, configure a variável MONGODB_URI no arquivo api/.env.local')
  process.exit(1)
}

async function createAdmin() {
  let client
  try {
    console.log('🔌 Conectando ao MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const db = client.db('aecac')
    const usersCollection = db.collection('users')
    
    // Verificar se já existe um admin
    const existingAdmin = await usersCollection.findOne({ email: ADMIN_EMAIL })
    if (existingAdmin) {
      console.log('⚠️  Admin já existe com este email!')
      console.log(`   Email: ${ADMIN_EMAIL}`)
      await client.close()
      return
    }
    
    // Criar hash da senha
    console.log('🔐 Gerando hash da senha...')
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
    
    // Criar usuário admin
    console.log('👤 Criando usuário admin...')
    const result = await usersCollection.insertOne({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      createdAt: new Date(),
    })
    
    console.log('\n✅ Admin criado com sucesso!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email:', ADMIN_EMAIL)
    console.log('🔑 Senha:', ADMIN_PASSWORD)
    console.log('🆔 ID:', result.insertedId)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n🌐 Acesse: http://localhost:5173/admin/login')
    console.log('')
    
    await client.close()
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message)
    if (client) {
      await client.close()
    }
    process.exit(1)
  }
}

createAdmin()

