const { GoogleGenAI } = require('@google/genai');

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';

function getProviderConfig() {
  const requested = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const provider = requested || (anthropicKey ? 'anthropic' : (geminiKey ? 'gemini' : 'offline'));

  if (provider === 'anthropic' || provider === 'claude') {
    return {
      id: 'anthropic',
      name: 'Anthropic Claude',
      apiKey: isValidApiKey('anthropic', anthropicKey) ? anthropicKey : '',
      model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL
    };
  }
  if (provider === 'gemini' || provider === 'google') {
    return {
      id: 'gemini',
      name: 'Google Gemini',
      apiKey: isValidApiKey('gemini', geminiKey) ? geminiKey : '',
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
    };
  }
  return { id: 'offline', name: 'Offline fallback', apiKey: '', model: null };
}

function isConfigured() {
  return Boolean(getProviderConfig().apiKey);
}

function isValidApiKey(provider, apiKey) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (provider === 'anthropic') return key.startsWith('sk-ant-api') && key.length > 20;
  if (provider === 'gemini') return key.length > 5 && !key.startsWith('YOUR_');
  return false;
}

function toText(contents) {
  return (contents || []).map(message => ({
    role: message.role === 'model' || message.role === 'assistant' ? 'assistant' : 'user',
    content: (message.parts || []).map(part => part.text || '').join('\n')
  })).filter(message => message.content);
}

async function generate({ contents, systemInstruction, temperature, maxOutputTokens, responseMimeType }) {
  const provider = getProviderConfig();
  if (!provider.apiKey) throw new Error(`${provider.name} API key is not configured.`);

  if (provider.id === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxOutputTokens || 1024,
        ...(typeof temperature === 'number' ? { temperature } : {}),
        ...(systemInstruction ? { system: systemInstruction } : {}),
        messages: toText(contents)
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API request failed with status ${response.status}.`);
    }
    const result = await response.json();
    const text = (result.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();
    return { text, provider: 'Anthropic Claude (Live)' };
  }

  const client = new GoogleGenAI({ apiKey: provider.apiKey });
  const result = await client.models.generateContent({
    model: provider.model,
    contents,
    config: {
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(typeof temperature === 'number' ? { temperature } : {}),
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
      ...(responseMimeType ? { responseMimeType } : {})
    }
  });
  return { text: result?.text || '', provider: 'Google Gemini (Live)' };
}

module.exports = { getProviderConfig, isConfigured, isValidApiKey, generate };
