import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

// Configurar bodyParser para aceitar até 10MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')
        const { categoria, nome, criadoPor, dataInicio, dataFim } = req.query

        let query = {}
        if (categoria && categoria !== 'todas') {
          query.categoria = categoria
        }
        
        // Filtro por nome (busca parcial, case-insensitive)
        if (nome) {
          query.nome = { $regex: nome, $options: 'i' }
        }
        
        // Filtro por criado por (busca parcial no nome)
        if (criadoPor) {
          query['criadoPor.nome'] = { $regex: criadoPor, $options: 'i' }
        }
        
        // Filtro por data
        if (dataInicio || dataFim) {
          query.createdAt = {}
          if (dataInicio) {
            query.createdAt.$gte = new Date(dataInicio)
          }
          if (dataFim) {
            // Adicionar 23:59:59 ao final do dia
            const fim = new Date(dataFim)
            fim.setHours(23, 59, 59, 999)
            query.createdAt.$lte = fim
          }
        }

        const documentos = await db
          .collection('documentos')
          .find(query)
          .sort({ createdAt: -1 })
          .toArray()

        res.status(200).json(documentos)
      } catch (error) {
        console.error('Erro ao buscar documentos:', error)
        res.status(500).json({ error: 'Erro ao buscar documentos' })
      }
    })(req, res)
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, categoria, arquivo, tipoArquivo, tamanhoArquivo } = req.body

        if (!nome || !categoria || !arquivo) {
          return res.status(400).json({ error: 'Nome, categoria e arquivo são obrigatórios' })
        }

        // Validar tipo de arquivo
        const tiposPermitidos = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ]

        if (!tiposPermitidos.includes(tipoArquivo)) {
          return res.status(400).json({ error: 'Tipo de arquivo não permitido. Use PDF, Word ou Excel.' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Obter informações do usuário logado
        const userId = req.userId
        
        // Buscar usuário na collection de admins
        let user = null
        let nomeUsuario = 'Admin'
        
        if (ObjectId.isValid(userId)) {
          user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
          if (user) {
            nomeUsuario = user.name || user.email || 'Admin'
          }
        }

        const documento = {
          nome,
          categoria,
          arquivo, // Base64 do arquivo
          tipoArquivo,
          tamanhoArquivo: tamanhoArquivo || 0,
          criadoPor: {
            userId,
            nome: nomeUsuario,
          },
          atualizadoPor: {
            userId,
            nome: nomeUsuario,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('documentos').insertOne(documento)
        res.status(201).json({ ...documento, _id: result.insertedId })
      } catch (error) {
        console.error('Erro ao criar documento:', error)
        res.status(500).json({ error: 'Erro ao criar documento' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

