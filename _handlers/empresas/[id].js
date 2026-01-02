import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { ObjectId } from 'mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'

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

  const { id } = req.query

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      const empresa = await db.collection('empresas').findOne({ _id: new ObjectId(id) })

      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada' })
      }

      res.status(200).json(empresa)
    } catch (error) {
      console.error('Erro ao buscar empresa:', error)
      res.status(500).json({ error: 'Erro ao buscar empresa' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, categoria, descricao, telefone, email, endereco, imagem, site, facebook, instagram, linkedin } = req.body

        console.log('Atualizando empresa:', {
          id,
          hasImagem: imagem !== undefined,
          imagemLength: imagem ? imagem.length : 0,
        })

        const client = await clientPromise
        const db = client.db('aecac')

        const updateData = { updatedAt: new Date() }
        if (nome) updateData.nome = nome
        if (categoria) updateData.categoria = categoria
        if (descricao) updateData.descricao = descricao
        if (telefone !== undefined) updateData.telefone = telefone
        if (email !== undefined) updateData.email = email
        if (endereco !== undefined) updateData.endereco = endereco
        if (site !== undefined) updateData.site = site
        if (facebook !== undefined) updateData.facebook = facebook
        if (instagram !== undefined) updateData.instagram = instagram
        if (linkedin !== undefined) updateData.linkedin = linkedin
        if (imagem !== undefined) {
          updateData.imagem = imagem // Pode ser null para remover ou base64 para adicionar/atualizar
          console.log('Imagem será atualizada:', imagem ? 'Sim' : 'Removida')
        }

        const result = await db.collection('empresas').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Empresa não encontrada' })
        }

        const empresa = await db.collection('empresas').findOne({ _id: new ObjectId(id) })
        res.status(200).json(empresa)
      } catch (error) {
        console.error('Erro ao atualizar empresa:', error)
        res.status(500).json({ error: 'Erro ao atualizar empresa' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        const result = await db.collection('empresas').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Empresa não encontrada' })
        }

        res.status(200).json({ message: 'Empresa deletada com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar empresa:', error)
        res.status(500).json({ error: 'Erro ao deletar empresa' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

