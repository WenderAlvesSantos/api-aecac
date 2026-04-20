import clientPromise from '../../lib/mongodb'
import { requireAuth } from '../../middleware/auth'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { enviarEmailNovoCadastroPendente } from '../../lib/email'

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
      console.error('Erro ao buscar fundadores (listagem pública):', error)
      res.status(500).json({ error: 'Erro ao carregar fundadores' })
    }
  } else if (req.method === 'POST') {
    // POST público: cadastro de fundador (coleção empresas; sem autenticação)
    try {
      const { nome, categoria, descricao, telefone, whatsapp, email, endereco, imagem, site, facebook, instagram, linkedin, cnpj, cep, responsavel, preCadastro } = req.body

      console.log('Recebendo cadastro de fundador:', {
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
        return res.status(409).json({ error: 'Já existe um cadastro de fundador com este CNPJ.' })
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
      console.log('Cadastro de fundador salvo. Status:', empresa.status, 'ID:', result.insertedId)

      // Disparo de email para admin não deve impedir o cadastro.
      await enviarEmailNovoCadastroPendente({
        ...empresa,
        _id: result.insertedId,
      }).catch((emailError) => {
        console.error('Erro ao notificar admin sobre novo cadastro:', emailError)
      })
      
      const mensagem = preCadastro 
        ? 'Pré-cadastro de fundador realizado com sucesso! Entraremos em contato em breve.'
        : 'Cadastro de fundador enviado com sucesso! Aguarde a aprovação do administrador.'
      
      res.status(201).json({ 
        ...empresa, 
        _id: result.insertedId,
        message: mensagem
      })
    } catch (error) {
      console.error('Erro ao cadastrar fundador:', error)
      res.status(500).json({ error: 'Erro ao enviar cadastro de fundador' })
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

