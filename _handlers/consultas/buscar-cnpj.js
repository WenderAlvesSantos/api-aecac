import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { cnpj } = req.query

    if (!cnpj) {
      return res.status(400).json({ error: 'CNPJ é obrigatório' })
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '')
    
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({ error: 'CNPJ deve ter 14 dígitos' })
    }

    // Buscar dados na API ReceitaWS
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`)
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro ao buscar CNPJ' })
    }

    const data = await response.json()

    if (data.status === 'ERROR') {
      return res.status(404).json({ error: 'CNPJ não encontrado ou inválido' })
    }

    // Retornar dados formatados
    res.status(200).json({
      nome: data.nome || '',
      email: data.email || '',
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      bairro: data.bairro || '',
      cep: data.cep || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
    })
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error)
    res.status(500).json({ error: 'Erro ao buscar dados do CNPJ' })
  }
}

