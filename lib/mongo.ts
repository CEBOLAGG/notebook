import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  // Em build/SSR sem env, deixamos a falha explícita ao usar o cliente.
  // Não jogamos throw aqui para não quebrar o build na Vercel.
  console.warn('[mongo] MONGODB_URI não definido — chamadas ao banco vão falhar em runtime');
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: Promise<MongoClient> | undefined;
}

function createClient(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI não configurado'));
  }
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });
  return client.connect();
}

export function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV !== 'production') {
    if (!global.__mongoClient) {
      global.__mongoClient = createClient();
    }
    return global.__mongoClient;
  }
  // Em produção (serverless) cada instância mantém sua própria promise.
  if (!global.__mongoClient) {
    global.__mongoClient = createClient();
  }
  return global.__mongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  // Permite que o nome do banco venha embutido na URI (recomendado).
  // Caso contrário, cai num default explícito.
  const dbName = new URL(uri ?? 'mongodb://localhost/notebookcheck').pathname.replace(/^\//, '') || 'notebookcheck';
  return client.db(dbName);
}
