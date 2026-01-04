import clientPromise from '../../lib/mongodb'
import { comparePassword, generateToken } from '../../lib/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  // Handle CORS preflight
  if (handleOptions(req, res)) {
    return
  }

  // Set CORS headers
  corsHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    const client = await clientPromise
    const db = client.db('aecac')
    
    // Normalizar email
    const normalizedEmail = email.trim().toLowerCase()
    
    // Buscar usuário associado na collection users_associados
    let user = await db.collection('users_associados').findOne({ 
      email: normalizedEmail
    })
    
    // Se não encontrou, tentar busca case-insensitive
    if (!user) {
      user = await db.collection('users_associados').findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      })
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas ou você não é um associado' })
    }

    // Verificar se a senha está hashada
    if (!user.password) {
      return res.status(401).json({ error: 'Usuário sem senha cadastrada. Entre em contato com o administrador.' })
    }
    
    // Verificar se a senha é um hash bcrypt válido
    const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')
    
    if (!isBcryptHash) {
      return res.status(401).json({ error: 'Senha do usuário precisa ser redefinida. Entre em contato com o administrador.' })
    }
    
    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Verificar se a empresa ainda está aprovada
    if (user.empresaId) {
      try {
        const empresa = await db.collection('empresas').findOne({ 
          _id: new ObjectId(user.empresaId) 
        })
        
        if (!empresa || empresa.status !== 'aprovado') {
          return res.status(403).json({ error: 'Sua empresa não está mais aprovada. Entre em contato com o administrador.' })
        }
      } catch (error) {
        console.error('Erro ao verificar empresa:', error)
        // Continuar mesmo se houver erro na verificação da empresa
      }
    }

    const token = generateToken(user._id.toString())

    res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        tipo: 'associado',
        empresaId: user.empresaId,
      },
    })
  } catch (error) {
    console.error('Erro no login de associado:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

