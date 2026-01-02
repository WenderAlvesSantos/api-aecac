import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'

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
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      const empresas = await db.collection('empresas').find({}).toArray()
      res.status(200).json(empresas)
    } catch (error) {
      console.error('Erro ao buscar empresas:', error)
      res.status(500).json({ error: 'Erro ao buscar empresas' })
    }
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, categoria, descricao, telefone, email, endereco, imagem, site, facebook, instagram, linkedin } = req.body

        console.log('Recebendo dados da empresa:', {
          nome,
          categoria,
          hasImagem: !!imagem,
          imagemLength: imagem ? imagem.length : 0,
        })

        if (!nome || !categoria || !descricao) {
          return res.status(400).json({ error: 'Campos obrigatórios faltando' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        const empresa = {
          nome,
          categoria,
          descricao,
          telefone: telefone || '',
          email: email || '',
          endereco: endereco || '',
          imagem: imagem || null,
          site: site || '',
          facebook: facebook || '',
          instagram: instagram || '',
          linkedin: linkedin || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('empresas').insertOne(empresa)
        console.log('Empresa criada com sucesso, ID:', result.insertedId)
        res.status(201).json({ ...empresa, _id: result.insertedId })
      } catch (error) {
        console.error('Erro ao criar empresa:', error)
        res.status(500).json({ error: 'Erro ao criar empresa' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

