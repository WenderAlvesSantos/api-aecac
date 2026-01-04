import clientPromise from '../../lib/mongodb'
import { corsHeaders, handleOptions } from '../../middleware/cors'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  corsHeaders(res)

  if (req.method === 'POST') {
    try {
      const { eventoId, nome, cpf, telefone } = req.body

      if (!eventoId || !nome || !cpf || !telefone) {
        return res.status(400).json({ error: 'ID do evento, nome, CPF e telefone são obrigatórios' })
      }

      // Validar CPF (11 dígitos)
      const cpfLimpo = cpf.replace(/\D/g, '')
      if (cpfLimpo.length !== 11) {
        return res.status(400).json({ error: 'CPF inválido. Deve conter 11 dígitos.' })
      }

      const client = await clientPromise
      const db = client.db('aecac')

      // Verificar se o evento existe
      const evento = await db.collection('eventos').findOne({ 
        _id: new ObjectId(eventoId) 
      })
      
      if (!evento) {
        return res.status(404).json({ error: 'Evento não encontrado' })
      }

      // Verificar se já está inscrito (por CPF)
      const eventoIdStr = eventoId.toString()
      const inscricaoExistente = await db.collection('inscricoes_publicas').findOne({
        tipo: 'evento',
        cpf: cpfLimpo,
        $or: [
          { eventoId: eventoIdStr },
          { eventoId: new ObjectId(eventoId) }
        ]
      })

      if (inscricaoExistente) {
        return res.status(409).json({ error: 'Este CPF já está inscrito neste evento' })
      }

      // Verificar vagas disponíveis
      if (evento.vagas) {
        const totalInscritos = await db.collection('inscricoes_publicas').countDocuments({
          tipo: 'evento',
          $or: [
            { eventoId: eventoIdStr },
            { eventoId: new ObjectId(eventoId) }
          ]
        })
        
        if (totalInscritos >= evento.vagas) {
          return res.status(403).json({ error: 'Não há vagas disponíveis para este evento' })
        }
      }

      // Registrar inscrição pública na collection unificada
      await db.collection('inscricoes_publicas').insertOne({
        tipo: 'evento',
        tipoInscricao: 'publico',
        eventoId: eventoIdStr,
        nome,
        cpf: cpfLimpo,
        telefone,
        dataInscricao: new Date(),
      })

      res.status(200).json({ 
        message: 'Inscrição realizada com sucesso!',
        evento: {
          titulo: evento.titulo,
          data: evento.data,
          hora: evento.hora,
          local: evento.local,
        }
      })
    } catch (error) {
      console.error('Erro ao inscrever em evento público:', error)
      res.status(500).json({ error: 'Erro ao realizar inscrição' })
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' })
  }
}

