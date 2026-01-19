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
      // Filtrar apenas empresas aprovadas para visualização pública
      const empresas = await db.collection('empresas').find({ status: 'aprovado' }).toArray()
      res.status(200).json(empresas)
    } catch (error) {
      console.error('Erro ao buscar empresas:', error)
      res.status(500).json({ error: 'Erro ao buscar empresas' })
    }
  } else if (req.method === 'POST') {
    // POST público para cadastro de empresas (sem autenticação)
    try {
      const { nome, categoria, descricao, telefone, whatsapp, email, endereco, imagem, site, facebook, instagram, linkedin, cnpj, cep, responsavel, preCadastro } = req.body

      console.log('Recebendo dados da empresa:', {
        nome,
        categoria,
        cnpj,
        preCadastro,
        hasImagem: !!imagem,
        imagemLength: imagem ? imagem.length : 0,
      })

      // Validar campos obrigatórios
      if (!nome || !categoria || !descricao || !cnpj) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando: nome, categoria, descrição e CNPJ são obrigatórios' })
      }

      // Validar formato do CNPJ (deve ter 14 dígitos)
      const cnpjLimpo = cnpj.replace(/\D/g, '')
      if (cnpjLimpo.length !== 14) {
        return res.status(400).json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' })
      }

      const client = await clientPromise
      const db = client.db('aecac')

      // Verificar se já existe empresa com este CNPJ
      const empresaExistente = await db.collection('empresas').findOne({ cnpj: cnpjLimpo })
      if (empresaExistente) {
        return res.status(409).json({ error: 'Já existe uma empresa cadastrada com este CNPJ.' })
      }

      const empresa = {
        nome,
        categoria,
        descricao,
        cnpj: cnpjLimpo, // Salvar CNPJ sem formatação
        cep: cep ? cep.replace(/\D/g, '') : '', // Salvar CEP sem formatação
        telefone: telefone || '',
        whatsapp: whatsapp || '',
        email: email || '',
        endereco: endereco || '',
        responsavel: responsavel || '',
        imagem: imagem || null,
        site: site || '',
        facebook: facebook || '',
        instagram: instagram || '',
        linkedin: linkedin || '',
        status: preCadastro ? 'pre-cadastro' : 'pendente', // Status dinâmico baseado na flag
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await db.collection('empresas').insertOne(empresa)
      console.log('Empresa cadastrada com sucesso. Status:', empresa.status, 'ID:', result.insertedId)
      
      const mensagem = preCadastro 
        ? 'Pré-cadastro realizado com sucesso! Entraremos em contato em breve.'
        : 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.'
      
      res.status(201).json({ 
        ...empresa, 
        _id: result.insertedId,
        message: mensagem
      })
    } catch (error) {
      console.error('Erro ao cadastrar empresa:', error)
      res.status(500).json({ error: 'Erro ao cadastrar empresa' })
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

