import clientPromise from '../../lib/mongodb'
import { comparePassword, generateToken } from '../../lib/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

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
    // Log do body recebido
    console.log('Body recebido:', JSON.stringify(req.body))
    console.log('Content-Type:', req.headers['content-type'])
    
    const { email, password } = req.body

    console.log('Tentativa de login:', { 
      email: email?.trim(), 
      passwordLength: password?.length,
      emailType: typeof email,
      passwordType: typeof password
    })

    if (!email || !password) {
      console.error('Campos faltando:', { hasEmail: !!email, hasPassword: !!password })
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    const client = await clientPromise
    const db = client.db('aecac')
    
    // Normalizar email (trim e lowercase)
    const normalizedEmail = email.trim().toLowerCase()
    
    // Buscar usuário ADMIN - tentar busca exata primeiro, depois case-insensitive
    // Admin não tem tipo ou tem tipo 'admin'
    let user = await db.collection('users').findOne({ 
      email: normalizedEmail,
      $or: [
        { tipo: { $exists: false } }, // Usuários antigos sem tipo são admin
        { tipo: 'admin' },
        { tipo: null }
      ]
    })
    
    // Se não encontrou, tentar busca case-insensitive
    if (!user) {
      user = await db.collection('users').findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        $or: [
          { tipo: { $exists: false } },
          { tipo: 'admin' },
          { tipo: null }
        ]
      })
    }

    if (!user) {
      console.error('Login falhou: usuário não encontrado', { 
        emailRecebido: normalizedEmail,
        usuariosNoBanco: await db.collection('users').find({}).toArray().then(users => users.map(u => ({ email: u.email, id: u._id })))
      })
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    console.log('Usuário encontrado:', { email: user.email, userId: user._id })
    
    // Verificar se a senha está hashada
    if (!user.password) {
      console.error('Login falhou: usuário sem senha', { email: user.email })
      return res.status(401).json({ error: 'Usuário sem senha cadastrada. Entre em contato com o administrador.' })
    }
    
    // Verificar se a senha é um hash bcrypt válido
    const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')
    
    if (!isBcryptHash) {
      console.error('Login falhou: senha não está hashada corretamente', { 
        email: user.email,
        passwordType: typeof user.password,
        passwordLength: user.password.length
      })
      return res.status(401).json({ error: 'Senha do usuário precisa ser redefinida. Entre em contato com o administrador.' })
    }
    
    const isValidPassword = await comparePassword(password, user.password)
    console.log('Validação de senha:', { isValidPassword })

    if (!isValidPassword) {
      console.error('Login falhou: senha inválida', { 
        email: user.email, 
        userId: user._id,
        hashNoBanco: user.password.substring(0, 20) + '...'
      })
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    console.log('Login bem-sucedido:', { email: user.email, userId: user._id })

    const token = generateToken(user._id.toString())

    res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Erro no login:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

