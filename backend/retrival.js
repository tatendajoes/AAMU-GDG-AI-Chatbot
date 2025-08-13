import { ChatOpenAI} from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import {OpenAIEmbeddings} from "langchain/embeddings/openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

dotenv.config();

const openAIApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

const embeddings = new OpenAIEmbeddings({ openAIApiKey });
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient,
    tableName: 'documents',
    queryName: 'match_documents'
})

const retriever  = vectorStore.asRetriever({
    searchType: 'similarity',
    searchParams: {
        k: 7
    }
})

//const test = await retriever.invoke("What classes should I take for a computer science major? I am a junior Electrical Engineering major at A & M University who loves football. ");
//console.log("Retrieved Context: ", test);

export { retriever }