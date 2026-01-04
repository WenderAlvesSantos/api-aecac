import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'
import { getUserInfo } from '../../lib/userInfo'

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

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      
      const beneficio = await db.collection('beneficios').findOne({ _id: new ObjectId(id) })
      
      if (!beneficio) {
        return res.status(404).json({ error: 'Benefício não encontrado' })
      }
      
      res.status(200).json(beneficio)
    } catch (error) {
      console.error('Erro ao buscar benefício:', error)
      res.status(500).json({ error: 'Erro ao buscar benefício' })
    }
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { titulo, descricao, empresaId, desconto, condicoes, validade, imagem, ativo, codigo, quantidade } = req.body
        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se o usuário tem permissão para editar este benefício
        const userInfo = await getUserInfo(req.userId)
        const beneficio = await db.collection('beneficios').findOne({ _id: new ObjectId(id) })
        
        if (!beneficio) {
          return res.status(404).json({ error: 'Benefício não encontrado' })
        }

        // Associado só pode editar benefícios da própria empresa
        if (userInfo.isAssociado) {
          const beneficioEmpresaId = beneficio.empresaId?.toString() || beneficio.empresaId
          const userEmpresaId = userInfo.empresaId?.toString() || userInfo.empresaId
          if (!userInfo.empresaId || beneficioEmpresaId !== userEmpresaId) {
            return res.status(403).json({ error: 'Você só pode editar benefícios da sua empresa' })
          }
        }

        const updateData = {
          updatedAt: new Date(),
        }

        if (titulo !== undefined) updateData.titulo = titulo
        if (descricao !== undefined) updateData.descricao = descricao
        if (empresaId !== undefined) updateData.empresaId = empresaId
        if (desconto !== undefined) updateData.desconto = desconto
        if (condicoes !== undefined) updateData.condicoes = condicoes
        if (validade !== undefined) updateData.validade = validade ? new Date(validade) : null
        if (imagem !== undefined) updateData.imagem = imagem
        if (ativo !== undefined) updateData.ativo = ativo
        if (codigo !== undefined) {
          // Verificar se o código já existe em outro benefício
          const codigoExistente = await db.collection('beneficios').findOne({ 
            codigo,
            _id: { $ne: new ObjectId(id) }
          })
          if (codigoExistente) {
            return res.status(400).json({ error: 'Este código já está em uso' })
          }
          updateData.codigo = codigo
        }
        if (quantidade !== undefined) updateData.quantidade = quantidade

        await db.collection('beneficios').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        )

        const beneficioAtualizado = await db.collection('beneficios').findOne({ _id: new ObjectId(id) })
        res.status(200).json(beneficioAtualizado)
      } catch (error) {
        console.error('Erro ao atualizar benefício:', error)
        res.status(500).json({ error: 'Erro ao atualizar benefício' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se o usuário tem permissão para deletar este benefício
        const userInfo = await getUserInfo(req.userId)
        const beneficio = await db.collection('beneficios').findOne({ _id: new ObjectId(id) })
        
        if (!beneficio) {
          return res.status(404).json({ error: 'Benefício não encontrado' })
        }

        // Associado só pode deletar benefícios da própria empresa
        if (userInfo.isAssociado) {
          const beneficioEmpresaId = beneficio.empresaId?.toString() || beneficio.empresaId
          const userEmpresaId = userInfo.empresaId?.toString() || userInfo.empresaId
          if (!userInfo.empresaId || beneficioEmpresaId !== userEmpresaId) {
            return res.status(403).json({ error: 'Você só pode excluir benefícios da sua empresa' })
          }
        }

        await db.collection('beneficios').deleteOne({ _id: new ObjectId(id) })
        res.status(200).json({ message: 'Benefício deletado com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar benefício:', error)
        res.status(500).json({ error: 'Erro ao deletar benefício' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

