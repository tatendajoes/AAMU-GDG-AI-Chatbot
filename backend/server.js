import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ragChain } from './generate.js';
import { clearMemory, getMemoryStats } from './memory.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) return;

    console.log(`Received question: ${question}`);

    const answer = await ragChain.invoke({ question: question.trim() });

    res.json({
      question: question.trim(),
      answer: answer,
      timestamp: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    console.error('Error processing question:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process your question. Please try again.',
      success: false
    });
  }
});

// Clear conversation memory
app.post('/api/clear-memory', async (req, res) => {
  try {
    clearMemory();
    res.json({
      message: 'Conversation memory cleared successfully',
      success: true
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear memory',
      success: false
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});