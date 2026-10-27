
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { generateCampaigns } from './campaignAgent.js';

import dashboardRouter from './routes/dashboard.js';
import productsRouter from './routes/products.js';
import customersRouter from './routes/customers.js';
import expiryRouter from './routes/expiry.js';
import campaignsRouter from './routes/campaigns.js';
import performanceRouter from './routes/performance.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '20kb' }));

// Initialize Gemini only when the API key is configured.
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// ─── Core health check ────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'FreshFlow backend is running!',
    gemini: ai ? 'configured' : 'not configured',
  });
});

// ─── Gemini raw API endpoint ──────────────────────────────────────────────────

app.post('/api/ai', async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini API is not configured on the server.'
    });
  }

  const { prompt } = req.body ?? {};

  if (
    typeof prompt !== 'string' ||
    prompt.trim().length === 0
  ) {
    return res.status(400).json({
      error: 'Please provide a non-empty prompt.'
    });
  }

  if (prompt.length > 4000) {
    return res.status(400).json({
      error: 'Prompt must be 4000 characters or fewer.'
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt.trim()
    });

    if (!response.text) {
      return res.status(502).json({
        error: 'Gemini returned no text response.'
      });
    }

    return res.json({
      success: true,
      reply: response.text
    });
  } catch (error) {
    console.error('Gemini API request failed:', error.message);
    return res.status(502).json({
      error: 'The AI request failed. Please try again.'
    });
  }
});

// ─── Campaign generation ──────────────────────────────────────────────────────

app.post('/api/campaigns/generate', async (req, res) => {
  try {
    const result = await generateCampaigns();
    res.json(result);
  } catch (error) {
    console.error('Campaign generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || null,
    });
  }
});

// ─── Feature routes ───────────────────────────────────────────────────────────

app.use('/api/dashboard', dashboardRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/expiry', expiryRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/performance', performanceRouter);

// ─── 404 fallback ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.listen(PORT, () => {
  console.log(`FreshFlow backend running at http://localhost:${PORT}`);
});
