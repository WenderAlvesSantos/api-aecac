import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { ObjectId } from 'mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'
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

      // Verificar se o usuário tem permissão para ver esta empresa
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (token) {
        // Se houver token, verificar se é associado da empresa ou admin
        try {
          const { verifyToken } = await import('../../lib/auth')
          const decoded = verifyToken(token)
          if (decoded) {
            const { getUserInfo } = await import('../../lib/userInfo')
            const userInfo = await getUserInfo(decoded.userId)
            
            // Associado pode ver apenas a própria empresa (mesmo se não estiver aprovada)
            if (userInfo.isAssociado) {
              if (userInfo.empresaId !== id) {
                return res.status(403).json({ error: 'Você não tem permissão para ver esta empresa' })
              }
              // Associado pode ver a própria empresa
              return res.status(200).json(empresa)
            }
            
            // Admin pode ver qualquer empresa
            if (userInfo.isAdmin) {
              return res.status(200).json(empresa)
            }
          }
        } catch (error) {
          // Se houver erro ao verificar token, continuar com validação pública
        }
      }

      // Se não houver token ou não for associado/admin, só retornar se estiver aprovada (público)
      if (empresa.status !== 'aprovado') {
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
        const { nome, categoria, descricao, telefone, whatsapp, email, endereco, imagem, site, facebook, instagram, linkedin, cnpj, cep, responsavel } = req.body

        console.log('Atualizando empresa:', {
          id,
          hasImagem: imagem !== undefined,
          imagemLength: imagem ? imagem.length : 0,
        })

        const client = await clientPromise
        const db = client.db('aecac')

        // Verificar se o usuário é associado e se está tentando atualizar a própria empresa
        const userInfo = await getUserInfo(req.userId)
        if (userInfo.isAssociado) {
          // Associado só pode atualizar a própria empresa
          if (!userInfo.empresaId || userInfo.empresaId !== id) {
            return res.status(403).json({ error: 'Você só pode atualizar os dados da sua própria empresa' })
          }
        }
        // Admin pode atualizar qualquer empresa

        // Se CNPJ está sendo atualizado, verificar se não está duplicado
        if (cnpj !== undefined) {
          const cnpjLimpo = cnpj.replace(/\D/g, '')
          if (cnpjLimpo.length !== 14) {
            return res.status(400).json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' })
          }
          
          // Verificar se outro registro já tem este CNPJ
          const empresaComCNPJ = await db.collection('empresas').findOne({ 
            cnpj: cnpjLimpo,
            _id: { $ne: new ObjectId(id) }
          })
          
          if (empresaComCNPJ) {
            return res.status(409).json({ error: 'Já existe outra empresa cadastrada com este CNPJ.' })
          }
        }

        const updateData = { updatedAt: new Date() }
        
        // Associados não podem alterar alguns campos (nome, categoria, CNPJ, status)
        if (!userInfo.isAssociado) {
          // Apenas admin pode alterar estes campos
          if (nome) updateData.nome = nome
          if (categoria) updateData.categoria = categoria
          if (cnpj !== undefined) updateData.cnpj = cnpj.replace(/\D/g, '')
        }
        
        // Campos que associados podem alterar
        if (descricao !== undefined) updateData.descricao = descricao
        if (telefone !== undefined) updateData.telefone = telefone
        if (whatsapp !== undefined) updateData.whatsapp = whatsapp
        if (email !== undefined) updateData.email = email
        if (endereco !== undefined) updateData.endereco = endereco
        if (responsavel !== undefined) updateData.responsavel = responsavel
        if (site !== undefined) updateData.site = site
        if (facebook !== undefined) updateData.facebook = facebook
        if (instagram !== undefined) updateData.instagram = instagram
        if (linkedin !== undefined) updateData.linkedin = linkedin
        if (cep !== undefined) updateData.cep = cep ? cep.replace(/\D/g, '') : ''
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

