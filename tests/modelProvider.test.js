const assert = require('assert');
const modelProvider = require('../services/modelProvider');

async function runTests() {
  const savedEnv = {
    AI_PROVIDER: process.env.AI_PROVIDER,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
  };
  const originalFetch = global.fetch;

  try {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api-test-placeholder';
    process.env.ANTHROPIC_MODEL = 'claude-test-model';
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    assert.strictEqual(modelProvider.isValidApiKey('anthropic', 'sk-ant-usr-session-token'), false);
    assert.strictEqual(modelProvider.isValidApiKey('anthropic', 'sk-ant-api-test-placeholder'), true);
    process.env.ANTHROPIC_API_KEY = 'sk-ant-usr-session-token';
    assert.strictEqual(modelProvider.isConfigured(), false);
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api-test-placeholder';

    let requestUrl;
    let requestOptions;
    global.fetch = async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'Claude response' }] })
      };
    };

    const result = await modelProvider.generate({
      contents: [
        { role: 'user', parts: [{ text: 'First question' }] },
        { role: 'model', parts: [{ text: 'Prior answer' }] },
        { role: 'user', parts: [{ text: 'Follow-up' }] }
      ],
      systemInstruction: 'Follow the policy context.',
      temperature: 0.1,
      maxOutputTokens: 256
    });

    const sentBody = JSON.parse(requestOptions.body);
    assert.strictEqual(requestUrl, 'https://api.anthropic.com/v1/messages');
    assert.strictEqual(requestOptions.headers['anthropic-version'], '2023-06-01');
    assert.strictEqual(requestOptions.headers['x-api-key'], 'sk-ant-api-test-placeholder');
    assert.strictEqual(sentBody.model, 'claude-test-model');
    assert.strictEqual(sentBody.system, 'Follow the policy context.');
    assert.deepStrictEqual(sentBody.messages.map(message => message.role), ['user', 'assistant', 'user']);
    assert.strictEqual(result.text, 'Claude response');
    assert.strictEqual(result.provider, 'Anthropic Claude (Live)');
    console.log('✓ PASS: Anthropic text provider maps system and multi-turn messages');
    console.log('✓ PASS: Anthropic account/session tokens are rejected as API keys');

    global.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(
      modelProvider.generate({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }),
      error => error.message === 'Anthropic API request failed with status 401.' &&
        !error.message.includes(process.env.ANTHROPIC_API_KEY)
    );
    console.log('✓ PASS: Anthropic errors surface status without exposing the API key');
  } finally {
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    global.fetch = originalFetch;
  }
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
