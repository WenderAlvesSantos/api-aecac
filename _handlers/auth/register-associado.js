import clientPromise from '../../lib/mongodb'
import { hashPassword, generateToken } from '../../lib/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'
import { enviarEmailBoasVindas } from '../../lib/email'

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
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' })
    }

    const client = await clientPromise
    const db = client.db('aecac')

    // Normalizar email
    const normalizedEmail = email.trim().toLowerCase()

    // Verificar se o usuário já existe na collection de associados
    const existingUser = await db.collection('users_associados').findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    })
    
    if (existingUser) {
      return res.status(400).json({ error: 'Este email já está cadastrado' })
    }

    // Verificar se existe uma empresa aprovada com este email
    const empresa = await db.collection('empresas').findOne({
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      status: 'aprovado'
    })

    if (!empresa) {
      return res.status(403).json({ 
        error: 'Email não encontrado em empresa aprovada. Verifique se sua empresa foi aprovada ou entre em contato com o administrador.' 
      })
    }

    const hashedPassword = await hashPassword(password)

    const result = await db.collection('users_associados').insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      name,
      empresaId: empresa._id.toString(), // Vincular à empresa
      createdAt: new Date(),
    })

    const userId = result.insertedId.toString()

    // Buscar notificações pendentes para este email e vinculá-las ao usuário
    try {
      const notificacoesPendentes = await db.collection('notificacoes_pendentes')
        .find({ email: normalizedEmail })
        .toArray()

      if (notificacoesPendentes.length > 0) {
        const notificacoes = notificacoesPendentes.map(np => ({
          userId,
          tipo: np.tipo,
          titulo: np.titulo,
          mensagem: np.mensagem,
          link: np.link,
          lida: false,
          createdAt: np.createdAt,
        }))

        await db.collection('notificacoes').insertMany(notificacoes)
        
        // Remover notificações pendentes após vincular
        await db.collection('notificacoes_pendentes').deleteMany({ email: normalizedEmail })
      }
    } catch (error) {
      console.error('Erro ao vincular notificações pendentes:', error)
      // Não falhar o registro se a vinculação de notificações falhar
    }

    // Enviar email de boas-vindas
    try {
      await enviarEmailBoasVindas(
        { name, email: normalizedEmail },
        empresa
      ).catch(error => {
        console.error('Erro ao enviar email de boas-vindas:', error)
        // Não falhar o registro se o email falhar
      })
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error)
    }

    const token = generateToken(userId)

    res.status(201).json({
      token,
      user: {
        id: result.insertedId.toString(),
        email: normalizedEmail,
        name,
        tipo: 'associado',
        empresaId: empresa._id.toString(),
      },
    })
  } catch (error) {
    console.error('Erro no registro de associado:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

