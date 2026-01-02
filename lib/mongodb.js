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

if (process.env.NODE_ENV === 'development') {
  // Em desenvolvimento, use uma variável global para evitar múltiplas conexões
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // Em produção, use uma variável global para reutilizar conexão
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
}

export default clientPromise

