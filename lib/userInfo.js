import clientPromise from './mongodb'
import { ObjectId } from 'mongodb'

/**
 * Obtém informações do usuário (se é admin ou associado) e retorna empresaId se for associado
 * @param {string} userId - ID do usuário
 * @returns {Promise<{isAssociado: boolean, empresaId: string|null, isAdmin: boolean}>}
 */
export async function getUserInfo(userId) {
  try {
    const client = await clientPromise
    const db = client.db('aecac')

    // Validar ObjectId antes de usar
    if (!ObjectId.isValid(userId)) {
      return {
        isAssociado: false,
        isAdmin: false,
        empresaId: null,
        user: null
      }
    }

    // Tentar buscar primeiro na collection de associados
    const associado = await db.collection('users_associados').findOne({
      _id: new ObjectId(userId)
    })

    if (associado) {
      // Converter empresaId para string se for ObjectId
      let empresaId = associado.empresaId || null
      if (empresaId && empresaId.toString) {
        empresaId = empresaId.toString()
      }
      return {
        isAssociado: true,
        isAdmin: false,
        empresaId: empresaId,
        user: associado
      }
    }

    // Se não encontrou, buscar na collection de admins
    const admin = await db.collection('users').findOne({
      _id: new ObjectId(userId)
    })

    if (admin) {
      return {
        isAssociado: false,
        isAdmin: true,
        empresaId: null,
        user: admin
      }
    }

    // Se não encontrou em nenhuma collection
    return {
      isAssociado: false,
      isAdmin: false,
      empresaId: null,
      user: null
    }
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error)
    return {
      isAssociado: false,
      isAdmin: false,
      empresaId: null,
      user: null
    }
  }
}

