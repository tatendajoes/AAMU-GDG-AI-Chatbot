// webBrowsing.js - Web browsing tools for school information

import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { StringOutputParser } from "langchain/schema/output_parser";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import dotenv from 'dotenv';

dotenv.config();

const model = new ChatOpenAI({ 
  openAIApiKey: process.env.OPENAI_API_KEY, 
  temperature: 0.3 
});

// Available school URLs
const SCHOOL_URLS = [
  'https://www.aamu.edu/',
  'https://www.aamu.edu/campus-life/housing/',
  'https://www.aamu.edu/academics/catalogs/undergraduate-bulletin.html',
  'https://www.aamu.edu/campus-life/',
  'https://www.aamu.edu/admissions/',
  'https://www.aamu.edu/student-affairs/',
  'https://www.aamu.edu/academics/',
  'https://www.aamu.edu/campus-life/dining/',
  'https://www.aamu.edu/about/news-events/',
  'https://www.aamu.edu/registrar/'
];

// School question detector chain
const schoolQuestionTemplate = `Determine if the following question is related to Alabama A&M University (AAMU) campus life, services, policies, or general university information (NOT academic courses/classes).

Examples of school-related questions:
- Housing information, dormitories, residence halls
- Dining services, meal plans
- Campus events, activities
- Admissions requirements, deadlines
- Student services, registrar
- Campus facilities, resources
- University policies, procedures

Question: {question}

Is this question related to AAMU school/campus information? Answer "Yes" or "No":`;

const schoolQuestionChain = PromptTemplate.fromTemplate(schoolQuestionTemplate)
  .pipe(model)
  .pipe(new StringOutputParser());

// URL selection chain
const urlSelectionTemplate = `Given a question about Alabama A&M University, select the 1-2 most relevant URLs to browse for information.

Available URLs:
${SCHOOL_URLS.map((url, index) => `${index + 1}. ${url}`).join('\n')}

Question: {question}

Select the most relevant URLs (respond with just the numbers, comma-separated, max 2):`;

const urlSelectionChain = PromptTemplate.fromTemplate(urlSelectionTemplate)
  .pipe(model)
  .pipe(new StringOutputParser());

/**
 * Check if question is school-related (not academic courses)
 * @param {string} question - User's question
 * @returns {boolean} True if school-related
 */
export async function isSchoolRelated(question) {
  try {
    const result = await schoolQuestionChain.invoke({ question });
    return result.toLowerCase().includes('yes');
  } catch (error) {
    console.error('Error in school question detection:', error);
    return false;
  }
}

/**
 * Select relevant URLs for a question
 * @param {string} question - User's question
 * @returns {string[]} Array of selected URLs
 */
async function selectURLs(question) {
  try {
    const result = await urlSelectionChain.invoke({ question });
    
    // Parse the response (expecting numbers like "1, 3" or "2")
    const numbers = result.match(/\d+/g) || [];
    const selectedURLs = numbers
      .slice(0, 2) // Max 2 URLs
      .map(num => SCHOOL_URLS[parseInt(num) - 1])
      .filter(url => url); // Remove undefined URLs
    
    // Fallback to main site if no valid selection
    if (selectedURLs.length === 0) {
      return [SCHOOL_URLS[0]]; // Main AAMU site
    }
    
    return selectedURLs;
  } catch (error) {
    console.error('Error in URL selection:', error);
    return [SCHOOL_URLS[0]]; // Fallback to main site
  }
}

/**
 * Browse a single URL and extract content
 * @param {string} url - URL to browse
 * @returns {object} {url, content, error}
 */
async function browseURL(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const loader = new CheerioWebBaseLoader(url, {
      selector: "main, .content, body", // Try to get main content
    });
    
    const docs = await Promise.race([
      loader.load(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 30000)
      )
    ]);
    
    clearTimeout(timeoutId);
    
    if (docs && docs.length > 0) {
      // Clean and limit content
      let content = docs[0].pageContent
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n+/g, '\n') // Normalize newlines
        .trim()
        .substring(0, 2000); // Limit to 2000 characters
      
      return {
        url,
        content,
        error: null
      };
    } else {
      return {
        url,
        content: "",
        error: "No content found"
      };
    }
  } catch (error) {
    return {
      url,
      content: "",
      error: error.message
    };
  }
}

/**
 * Browse multiple school URLs for information
 * @param {string} question - User's question
 * @returns {string} Combined content from browsed pages
 */
export async function browseSchoolWebsites(question) {
  try {
    console.log('Selecting URLs for question:', question);
    
    // Select relevant URLs
    const selectedURLs = await selectURLs(question);
    console.log('Selected URLs:', selectedURLs);
    
    // Browse selected URLs concurrently
    const browsePromises = selectedURLs.map(url => browseURL(url));
    const results = await Promise.all(browsePromises);
    
    // Combine successful results
    let combinedContent = "";
    const successfulResults = results.filter(result => result.content && !result.error);
    
    if (successfulResults.length === 0) {
      return "Unable to retrieve current information from school websites.";
    }
    
    successfulResults.forEach((result, index) => {
      combinedContent += `\n--- Information from ${result.url} ---\n`;
      combinedContent += result.content;
      if (index < successfulResults.length - 1) {
        combinedContent += "\n";
      }
    });
    
    // Log errors for failed URLs
    const failedResults = results.filter(result => result.error);
    if (failedResults.length > 0) {
      console.log('Failed to browse:', failedResults.map(r => `${r.url}: ${r.error}`));
    }
    
    return combinedContent.trim();
    
  } catch (error) {
    console.error('Error in browseSchoolWebsites:', error);
    return "Error retrieving information from school websites.";
  }
}

/**
 * Debug function to test URL selection
 * @param {string} question - Test question
 */
export async function testURLSelection(question) {
  console.log('Question:', question);
  console.log('Is school related:', await isSchoolRelated(question));
  const urls = await selectURLs(question);
  console.log('Selected URLs:', urls);
  return urls;
}