import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI não está configurada!')
  throw new Error('Please add your Mongo URI to environment variables')
}

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

let client
let clientPromise

// Em ambos os ambientes, use uma variável global para reutilizar conexão
if (!global._mongoClientPromise) {
  console.log('Criando nova conexão MongoDB...')
  client = new MongoClient(uri, options)
  global._mongoClientPromise = client.connect().catch((error) => {
    console.error('Erro ao conectar MongoDB:', error)
    global._mongoClientPromise = null
    throw error
  })
}
clientPromise = global._mongoClientPromise

export default clientPromise

