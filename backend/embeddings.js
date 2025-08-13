import fs from 'fs';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

//const inputFile = 'compiled_output.txt';
const inputFile = 'courselist.txt';

// Read the compiled text
const text = fs.readFileSync(inputFile, 'utf-8');

// Split the text into chunks
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
});

const output = await splitter.createDocuments(
  text.split(/\n(?=Subject:\s*)/g) // split before embedding
);

// Supabase and OpenAI credentials
const sbApiKey = process.env.SUPABASE_API_KEY;
const sbUrl = process.env.SUPABASE_URL;
const openAIApiKey = process.env.OPENAI_API_KEY;

// Create Supabase client
const client = createClient(sbUrl, sbApiKey);

// Store embeddings in Supabase vector store
try {
  await SupabaseVectorStore.fromDocuments(
    output,
    new OpenAIEmbeddings({ openAIApiKey }),
    {
      client,
      tableName: 'documents', 
    }
  );
  console.log('Embeddings stored in Supabase vector database.');
} catch (err) {
  console.log(err);
}