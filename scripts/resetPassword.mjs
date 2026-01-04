import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não encontrada no .env.local')
  process.exit(1)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function resetPassword() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Conectado ao MongoDB\n')
    
    const db = client.db('aecac')
    
    // Listar usuários
    const users = await db.collection('users').find({}).toArray()
    console.log('Usuários disponíveis:')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name || 'Sem nome'})`)
    })
    
    const email = await question('\nDigite o email do usuário para redefinir a senha: ')
    const newPassword = await question('Digite a nova senha: ')
    
    if (!email || !newPassword) {
      console.error('❌ Email e senha são obrigatórios')
      process.exit(1)
    }
    
    // Normalizar email
    const normalizedEmail = email.trim().toLowerCase()
    
    // Buscar usuário
    const user = await db.collection('users').findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
    })
    
    if (!user) {
      console.error(`❌ Usuário com email "${email}" não encontrado`)
      process.exit(1)
    }
    
    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Atualizar senha
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    )
    
    console.log(`\n✅ Senha redefinida com sucesso para ${user.email}`)
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await client.close()
    rl.close()
  }
}

resetPassword()

