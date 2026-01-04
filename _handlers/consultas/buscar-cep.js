import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { cep } = req.query

    if (!cep) {
      return res.status(400).json({ error: 'CEP é obrigatório' })
    }

    const cepLimpo = cep.replace(/\D/g, '')
    
    if (cepLimpo.length !== 8) {
      return res.status(400).json({ error: 'CEP deve ter 8 dígitos' })
    }

    // Buscar dados na API ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro ao buscar CEP' })
    }

    const data = await response.json()

    if (data.erro) {
      return res.status(404).json({ error: 'CEP não encontrado' })
    }

    // Retornar dados formatados
    res.status(200).json({
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      cep: data.cep || '',
    })
  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
    res.status(500).json({ error: 'Erro ao buscar dados do CEP' })
  }
}

