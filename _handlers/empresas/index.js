import clientPromise from '../../lib/mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { enviarCadastroFundadorComCartaPdf, enviarEmailNovoCadastroPendente } from '../../lib/email'
import { verifyToken, getTokenFromRequest } from '../../lib/auth'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

function trimStr(v) {
  return typeof v === 'string' ? v.trim() : ''
}

function parseAssinaturaBase64(assinaturaCarta) {
  const m = /^data:image\/(png|jpeg|jpg);base64,([\s\S]+)$/i.exec(assinaturaCarta || '')
  if (!m) return null
  try {
    return Buffer.from(m[2], 'base64')
  } catch {
    return null
  }
}

function validarCartaPublica(cartaAdesao, assinaturaCarta) {
  if (!cartaAdesao || typeof cartaAdesao !== 'object') {
    return { ok: false, error: 'Carta de adesão não informada. Preencha e assine antes de enviar.' }
  }
  const rg = trimStr(cartaAdesao.rg)
  const cpf = trimStr(cartaAdesao.cpf).replace(/\D/g, '')
  const dia = trimStr(cartaAdesao.dia)
  const mes = trimStr(cartaAdesao.mes)
  const ano = trimStr(cartaAdesao.ano)
  if (!rg || rg.length < 3) return { ok: false, error: 'RG na carta de adesão é obrigatório.' }
  if (!cpf || cpf.length !== 11) return { ok: false, error: 'CPF na carta de adesão deve conter 11 dígitos.' }
  if (!dia || !/^\d{1,2}$/.test(dia)) return { ok: false, error: 'Preencha o dia da data na carta de adesão.' }
  if (!mes || mes.length < 3) return { ok: false, error: 'Preencha o mês por extenso na carta de adesão.' }
  if (!ano || !/^\d{2}$/.test(ano)) return { ok: false, error: 'Preencha os dois dígitos do ano na carta de adesão.' }
  if (!assinaturaCarta || typeof assinaturaCarta !== 'string') {
    return { ok: false, error: 'Assinatura na carta de adesão é obrigatória.' }
  }
  const assinaturaBuf = parseAssinaturaBase64(assinaturaCarta)
  if (!assinaturaBuf || assinaturaBuf.length < 800) {
    return { ok: false, error: 'Assinatura inválida ou muito curta. Desenhe a assinatura no campo indicado.' }
  }
  return {
    ok: true,
    cartaAdesaoSan: { rg, cpf, dia, mes, ano },
    assinaturaBuf,
    assinaturaCarta,
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'GET') {
    try {
      const client = await clientPromise
      const db = client.db('aecac')
      const empresas = await db.collection('empresas').find({ status: 'aprovado' }).toArray()
      res.status(200).json(empresas)
    } catch (error) {
      console.error('Erro ao buscar fundadores (listagem pública):', error)
      res.status(500).json({ error: 'Erro ao carregar fundadores' })
    }
  } else if (req.method === 'POST') {
    try {
      const {
        nome,
        categoria,
        descricao,
        telefone,
        whatsapp,
        email,
        endereco,
        imagem,
        site,
        facebook,
        instagram,
        linkedin,
        cnpj,
        cep,
        responsavel,
        preCadastro,
        cartaAdesao,
        assinaturaCarta,
        rg,
        cpf,
      } = req.body

      if (!nome || !categoria || !descricao || !cnpj) {
        return res.status(400).json({
          error: 'Campos obrigatórios faltando: nome, categoria, descrição e CNPJ são obrigatórios',
        })
      }

      const cnpjLimpo = String(cnpj).replace(/\D/g, '')
      if (cnpjLimpo.length !== 14) {
        return res.status(400).json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' })
      }

      const token = getTokenFromRequest(req)
      const authUser = token ? verifyToken(token) : null
      const cadastroPublico = req.body.cadastroPublicoFundador === true
      const hasCartaPayload =
        cartaAdesao &&
        typeof cartaAdesao === 'object' &&
        assinaturaCarta &&
        typeof assinaturaCarta === 'string' &&
        assinaturaCarta.length > 100

      const adminSemCarta = authUser && !hasCartaPayload && !cadastroPublico

      if (!adminSemCarta) {
        const emailTrim = trimStr(email)
        if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
          return res.status(400).json({
            error: 'E-mail válido é obrigatório para concluir o cadastro com a carta de adesão.',
          })
        }
      }

      const client = await clientPromise
      const db = client.db('aecac')

      const empresaExistente = await db.collection('empresas').findOne({ cnpj: cnpjLimpo })
      if (empresaExistente) {
        return res.status(409).json({ error: 'Já existe um cadastro de fundador com este CNPJ.' })
      }

      if (adminSemCarta) {
        const empresa = {
          nome,
          categoria,
          descricao,
          cnpj: cnpjLimpo,
          cep: cep ? String(cep).replace(/\D/g, '') : '',
          telefone: telefone || '',
          whatsapp: whatsapp || '',
          email: trimStr(email) || '',
          endereco: endereco || '',
          responsavel: responsavel || '',
          rg: trimStr(rg),
          cpf: String(cpf || '').replace(/\D/g, ''),
          imagem: imagem || null,
          site: site || '',
          facebook: facebook || '',
          instagram: instagram || '',
          linkedin: linkedin || '',
          status: preCadastro ? 'pre-cadastro' : 'pendente',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const result = await db.collection('empresas').insertOne(empresa)
        await enviarEmailNovoCadastroPendente({ ...empresa, _id: result.insertedId }).catch((e) =>
          console.error('Erro ao notificar admin (cadastro interno):', e)
        )

        const mensagem = preCadastro
          ? 'Pré-cadastro de fundador realizado com sucesso! Entraremos em contato em breve.'
          : 'Cadastro de fundador enviado com sucesso! Aguarde a aprovação do administrador.'

        return res.status(201).json({ ...empresa, _id: result.insertedId, message: mensagem })
      }

      const cartaBase = cartaAdesao && typeof cartaAdesao === 'object' ? { ...cartaAdesao } : {}
      const cpfBody = String(cpf || '').replace(/\D/g, '')
      const cpfCarta = String(cartaBase.cpf || '').replace(/\D/g, '')
      const rgBody = trimStr(rg)
      const rgCarta = trimStr(cartaBase.rg)
      const cartaMerged = {
        ...cartaBase,
        rg: rgBody || rgCarta,
        cpf: cpfBody || cpfCarta,
      }

      const v = validarCartaPublica(cartaMerged, assinaturaCarta)
      if (!v.ok) {
        return res.status(400).json({ error: v.error })
      }

      const emailTrim = trimStr(email)
      if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        return res.status(400).json({
          error: 'E-mail válido é obrigatório para concluir o cadastro com a carta de adesão.',
        })
      }

      const empresa = {
        nome,
        categoria,
        descricao,
        cnpj: cnpjLimpo,
        cep: cep ? String(cep).replace(/\D/g, '') : '',
        telefone: telefone || '',
        whatsapp: whatsapp || '',
        email: emailTrim,
        endereco: endereco || '',
        responsavel: responsavel || '',
        rg: v.cartaAdesaoSan.rg,
        cpf: v.cartaAdesaoSan.cpf,
        imagem: imagem || null,
        site: site || '',
        facebook: facebook || '',
        instagram: instagram || '',
        linkedin: linkedin || '',
        status: preCadastro ? 'pre-cadastro' : 'pendente',
        cartaAdesao: v.cartaAdesaoSan,
        assinaturaCarta: v.assinaturaCarta,
        cartaAssinadaEm: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { buildCartaAdesaoPdfBuffer } = await import('../../lib/cartaAdesaoPdf')
      const pdfBuffer = await buildCartaAdesaoPdfBuffer(
        {
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          responsavel: empresa.responsavel,
          telefone: empresa.telefone,
          email: empresa.email,
          endereco: empresa.endereco,
          cep: empresa.cep,
        },
        v.cartaAdesaoSan,
        v.assinaturaBuf
      )

      const result = await db.collection('empresas').insertOne(empresa)
      const empresaComId = { ...empresa, _id: result.insertedId }

      await enviarCadastroFundadorComCartaPdf({
        empresa: empresaComId,
        pdfBuffer,
      }).catch((emailError) => {
        console.error('Erro ao enviar e-mails com PDF da carta:', emailError)
      })

      const mensagem = preCadastro
        ? 'Pré-cadastro de fundador concluído com carta de adesão assinada.'
        : 'Cadastro de fundador enviado com carta de adesão assinada. Aguarde a análise da equipe.'

      return res.status(201).json({
        ...empresa,
        _id: result.insertedId,
        message: mensagem,
      })
    } catch (error) {
      console.error('Erro ao cadastrar fundador:', error)
      res.status(500).json({ error: 'Erro ao enviar cadastro de fundador' })
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}
