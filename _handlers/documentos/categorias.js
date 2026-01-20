import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    return requireAuth(async (req, res) => {
      try {
        const client = await clientPromise
        const db = client.db('aecac')

        // Buscar todas as categorias únicas dos documentos
        const categorias = await db
          .collection('documentos')
          .distinct('categoria')

        // Buscar categorias customizadas (se houver uma coleção separada)
        const categoriasCustom = await db
          .collection('categorias_documentos')
          .find({})
          .sort({ nome: 1 })
          .toArray()

        // Retornar objetos com informações completas
        // Categorias dos documentos (sem ID)
        const categoriasDocumentos = categorias.map((nome) => ({ nome, _id: null, custom: false }))
        
        // Categorias customizadas (com ID)
        const categoriasCustomCompleto = categoriasCustom.map((cat) => ({
          nome: cat.nome,
          _id: cat._id,
          descricao: cat.descricao,
          custom: true,
        }))

        // Combinar e remover duplicatas
        const todasCategoriasMap = new Map()
        categoriasDocumentos.forEach((cat) => {
          if (!todasCategoriasMap.has(cat.nome)) {
            todasCategoriasMap.set(cat.nome, cat)
          }
        })
        categoriasCustomCompleto.forEach((cat) => {
          todasCategoriasMap.set(cat.nome, cat)
        })

        const todasCategorias = Array.from(todasCategoriasMap.values()).sort((a, b) =>
          a.nome.localeCompare(b.nome)
        )

        res.status(200).json(todasCategorias)
      } catch (error) {
        console.error('Erro ao buscar categorias:', error)
        res.status(500).json({ error: 'Erro ao buscar categorias' })
      }
    })(req, res)
  } else if (req.method === 'POST') {
    return requireAuth(async (req, res) => {
      try {
        const { nome, descricao } = req.body

        if (!nome) {
          return res.status(400).json({ error: 'Nome da categoria é obrigatório' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se a categoria já existe
        const categoriaExistente = await db
          .collection('categorias_documentos')
          .findOne({ nome: nome.trim() })

        if (categoriaExistente) {
          return res.status(400).json({ error: 'Categoria já existe' })
        }

        const categoria = {
          nome: nome.trim(),
          descricao: descricao || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('categorias_documentos').insertOne(categoria)
        res.status(201).json({ ...categoria, _id: result.insertedId })
      } catch (error) {
        console.error('Erro ao criar categoria:', error)
        res.status(500).json({ error: 'Erro ao criar categoria' })
      }
    })(req, res)
  } else if (req.method === 'PUT') {
    return requireAuth(async (req, res) => {
      try {
        const { id, nome, descricao } = req.body

        if (!id || !nome) {
          return res.status(400).json({ error: 'ID e nome são obrigatórios' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se existe outra categoria com o mesmo nome
        const categoriaExistente = await db
          .collection('categorias_documentos')
          .findOne({ nome: nome.trim(), _id: { $ne: new ObjectId(id) } })

        if (categoriaExistente) {
          return res.status(400).json({ error: 'Já existe uma categoria com este nome' })
        }

        const result = await db.collection('categorias_documentos').updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              nome: nome.trim(),
              descricao: descricao || '',
              updatedAt: new Date(),
            },
          }
        )

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Categoria não encontrada' })
        }

        const categoriaAtualizada = await db
          .collection('categorias_documentos')
          .findOne({ _id: new ObjectId(id) })

        res.status(200).json(categoriaAtualizada)
      } catch (error) {
        console.error('Erro ao atualizar categoria:', error)
        res.status(500).json({ error: 'Erro ao atualizar categoria' })
      }
    })(req, res)
  } else if (req.method === 'DELETE') {
    return requireAuth(async (req, res) => {
      try {
        const { id } = req.query

        if (!id) {
          return res.status(400).json({ error: 'ID é obrigatório' })
        }

        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se há documentos usando esta categoria
        const categoria = await db
          .collection('categorias_documentos')
          .findOne({ _id: new ObjectId(id) })

        if (!categoria) {
          return res.status(404).json({ error: 'Categoria não encontrada' })
        }

        const documentosComCategoria = await db
          .collection('documentos')
          .countDocuments({ categoria: categoria.nome })

        if (documentosComCategoria > 0) {
          return res.status(400).json({
            error: `Não é possível deletar a categoria. Existem ${documentosComCategoria} documento(s) usando esta categoria.`,
          })
        }

        const result = await db.collection('categorias_documentos').deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Categoria não encontrada' })
        }

        res.status(200).json({ message: 'Categoria deletada com sucesso' })
      } catch (error) {
        console.error('Erro ao deletar categoria:', error)
        res.status(500).json({ error: 'Erro ao deletar categoria' })
      }
    })(req, res)
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

