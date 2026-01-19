import clientPromise from '../../lib/mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  const client = await clientPromise
  const db = client.db('aecac')

  if (req.method === 'GET') {
    // Rota PÚBLICA - qualquer um pode consultar
    try {
      const config = await db.collection('configuracoes').findOne({})
      
      const featureFlags = config?.featureFlags || {
        preLancamento: false,
        mostrarParceiros: true,
        mostrarEmpresas: true,
        mostrarEventos: true,
        mostrarBeneficios: true,
        mostrarCapacitacoes: true,
        mostrarGaleria: true,
        preCadastroMode: false,
      }

      res.status(200).json(featureFlags)
    } catch (error) {
      console.error('Erro ao buscar feature flags:', error)
      // Retornar valores padrão em caso de erro
      res.status(200).json({
        preLancamento: false,
        mostrarParceiros: true,
        mostrarEmpresas: true,
        mostrarEventos: true,
        mostrarBeneficios: true,
        mostrarCapacitacoes: true,
        mostrarGaleria: true,
        preCadastroMode: false,
      })
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

