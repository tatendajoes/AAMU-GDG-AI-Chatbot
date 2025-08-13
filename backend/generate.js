// Import necessary modules from LangChain
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { StringOutputParser } from "langchain/schema/output_parser";
import { retriever } from "./retrival.js";
import { combinedDocuments } from "./combinedDocuments";
import { RunnableSequence, RunnablePassthrough, RunnableLambda } from "langchain/schema/runnable";
import { getMemoryForChain, addToMemory } from './memory.js';
import { isSchoolRelated, browseSchoolWebsites } from './webBrowsing.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
const openAIApiKey = process.env.OPENAI_API_KEY;
const model = new ChatOpenAI({ openAIApiKey, temperature: 0.7 });



// Define If Class Information context needed
const classInfoTemplate = 'Given a question, determine course or class information context is needed to answer the question. Answer with "Yes" or "No".\n\n{question} Needs class information context: ';
const classInfoChain = PromptTemplate.fromTemplate(classInfoTemplate).pipe(model).pipe(new StringOutputParser());

// Set standalone question chain and retrieve from RAG DB if needed
const standalonetemplate = 'Given a question convert it to a standalone question. Do this only if the input param is Yes, else just put a null .  \n\n question: {question} standalone_question: ';
const RetrieveChain = PromptTemplate.fromTemplate(standalonetemplate).pipe(model).pipe(new StringOutputParser()).pipe(retriever).pipe(combinedDocuments);

// Set final answer chain
//const finalAnswerTemplate = 'You are a helpful assistant that helps students with their academic questions. Use the following context to provide a detailed and accurate answer to the question. If the context is not sufficient, use your knowledge to fill in the gaps. If you do not know the answer, say "I don\'t know".\n\nContext: {context}\n\nQuestion: {question}\n\nAnswer: ';
const finalAnswerTemplate = 'You are a helpful assistant that helps students with their academic questions. Use the following context and chat history to provide a detailed and accurate answer to the question. If the context is not sufficient, use your knowledge to fill in the gaps. If you do not know the answer, say "I don\'t know".\n\nChat History: {chatHistory}\nContext: {context}\n\nQuestion: {question}\n\nAnswer: ';
const finalAnswerChain = PromptTemplate.fromTemplate(finalAnswerTemplate).pipe(model).pipe(new StringOutputParser());

// test the retriever 
//const test = await RetrieveChain.invoke({ question: "What classes should I take.  I am a junior Electrical Engineering major available in fall at A & M University."});
//console.log("Retrieved Context: ", test);

/*const finalchain = RunnableSequence.from([
    {orginalinput: new RunnablePassthrough()

    },
    classInfoChain,

    (needsContext) => (needsContext.toLowerCase().includes("yes") ? {
      question: ({ orginalinput }) => orginalinput.question,
      context: RetrieveChain
    } : null),
    //finalAnswerChain,
]);
*/

const finalchain = RunnableSequence.from([
  {
    originalInput: new RunnablePassthrough(),
    question: (input) => input.question,
    chatHistory: () => getMemoryForChain()  // Get chat history at the start
  },
     
  // Get the needsContext result
  new RunnableLambda({
    func: async (input) => {
      const needsContext = await classInfoChain.invoke({ question: input.question });
      return {
        ...input,
        needsContext: needsContext
      };
    }
  }),
  // Decide on context source based on needsContext and isSchoolRelated
new RunnableLambda({
  func: async (input) => {
    const needsContext = input.needsContext?.toLowerCase().includes("yes");
                          
    if (needsContext) {
      // Academic/class questions - use RAG
      return {
        question: input.originalInput.question,
        context: await RetrieveChain.invoke({question: input.originalInput.question}),
        chatHistory: input.chatHistory,
        originalQuestion: input.originalInput.question
      };
    } else if (await isSchoolRelated(input.originalInput.question)) {
      // School-related questions - browse websites
      return {
        question: input.originalInput.question,
        context: await browseSchoolWebsites(input.originalInput.question),
        chatHistory: input.chatHistory,
        originalQuestion: input.originalInput.question
      };
    } else {
      // General questions - no context
      return {
        question: input.originalInput.question,
        context: "",
        chatHistory: input.chatHistory,
        originalQuestion: input.originalInput.question
      };
    }
  }
}),
        
  // Combine finalAnswerChain with memory storage
  new RunnableLambda({
    func: async (input) => {
      // Get the final answer
      const finalAnswer = await finalAnswerChain.invoke(input);
      
      // Store in memory
      await addToMemory(input.originalQuestion, finalAnswer);
      
      // Return the answer
      return finalAnswer;
    }
  })
]);

//const chaintest = await finalchain.invoke({ question: "What classes should I take for a computer science major?."});
//console.log("Final Answer: ", chaintest);
export { finalchain as ragChain };
















