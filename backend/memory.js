
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { StringOutputParser } from "langchain/schema/output_parser";
import dotenv from 'dotenv';

dotenv.config();

// Initialize model for summarization
const model = new ChatOpenAI({ 
  openAIApiKey: process.env.OPENAI_API_KEY, 
  temperature: 0.3 // Lower temperature for consistent summarization
});

// Summarization chain
const summaryTemplate = `Summarize the following conversation between a student and an academic assistant. Focus on:
1. Key student context (major, year, preferences mentioned)
2. Important academic information discussed
3. Main topics covered

Keep the summary to 2-3 sentences and preserve important student details.

Conversation:
{conversation}

Summary:`;

const summarizationChain = PromptTemplate.fromTemplate(summaryTemplate)
  .pipe(model)
  .pipe(new StringOutputParser());

// In-memory storage for current session
let conversationHistory = [];
let conversationSummary = "";

// Configuration
const MAX_EXCHANGES = 6; // Trigger summarization after this many Q&A pairs

/**
 * Get formatted chat history for use in prompts
 * @returns {string} Formatted chat history
 */
export function getMemoryForChain() {
  if (conversationHistory.length === 0 && !conversationSummary) {
    return "";
  }

  let formattedHistory = "";
  
  // Add summary if it exists
  if (conversationSummary) {
    formattedHistory += `Previous conversation summary: ${conversationSummary}\n\n`;
  }
  
  // Add recent exchanges
  if (conversationHistory.length > 0) {
    formattedHistory += "Recent conversation:\n";
    conversationHistory.forEach((exchange, index) => {
      formattedHistory += `Q${index + 1}: ${exchange.question}\n`;
      formattedHistory += `A${index + 1}: ${exchange.answer}\n\n`;
    });
  }
  
  return formattedHistory.trim();
}

/**
 * Add a new question-answer exchange to memory
 * @param {string} question - User's question
 * @param {string} answer - Assistant's answer
 */
export async function addToMemory(question, answer) {
  // Add new exchange
  conversationHistory.push({ question, answer, timestamp: new Date() });
  
  // Check if summarization is needed
  if (shouldSummarize()) {
    await summarizeAndCompress();
  }
}

/**
 * Check if conversation should be summarized
 * @returns {boolean} True if summarization is needed
 */
function shouldSummarize() {
  return conversationHistory.length >= MAX_EXCHANGES;
}

/**
 * Summarize conversation and compress memory
 */
async function summarizeAndCompress() {
  try {
    // Format conversation for summarization
    let conversationText = "";
    if (conversationSummary) {
      conversationText += `Previous summary: ${conversationSummary}\n\n`;
    }
    
    conversationHistory.forEach((exchange, index) => {
      conversationText += `Student: ${exchange.question}\n`;
      conversationText += `Assistant: ${exchange.answer}\n\n`;
    });
    
    // Get summary
    const newSummary = await summarizationChain.invoke({
      conversation: conversationText
    });
    
    // Update memory
    conversationSummary = newSummary;
    
    // Keep only the last 2 exchanges and clear the rest
    conversationHistory = conversationHistory.slice(-2);
    
    console.log("Memory summarized and compressed");
    
  } catch (error) {
    console.error("Error during summarization:", error);
    // If summarization fails, just keep recent exchanges
    conversationHistory = conversationHistory.slice(-3);
  }
}

/**
 * Clear all memory (useful for new sessions)
 */
export function clearMemory() {
  conversationHistory = [];
  conversationSummary = "";
  console.log("Memory cleared");
}

/**
 * Get memory statistics (for debugging)
 * @returns {object} Memory stats
 */
export function getMemoryStats() {
  return {
    exchangeCount: conversationHistory.length,
    hasSummary: !!conversationSummary,
    lastActivity: conversationHistory.length > 0 ? 
      conversationHistory[conversationHistory.length - 1].timestamp : null
  };
}

/**
 * Get raw memory data (for debugging)
 * @returns {object} Raw memory data
 */
export function getMemoryDebug() {
  return {
    conversationHistory,
    conversationSummary,
    formattedHistory: getMemoryForChain()
  };
}