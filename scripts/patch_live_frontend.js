const fs = require('fs');

let s = fs.readFileSync('public/app.html', 'utf8');

// 1. Add Mic button into Copilot Form
const targetForm = `            <!-- Chat Input Form -->
            <form onsubmit="handleCopilotSubmit(event)"
              style="display: flex; gap: 10px; padding: 12px 18px; background: #121212; border-top: 1px solid var(--border-subtle);">
              <input type="text" id="copilotInput" class="form-control" style="flex: 1;"
                placeholder="Ask a workplace question, query policy rules, or request a message rewrite..."
                autocomplete="off">
              <button type="submit" class="btn btn-primary">Send</button>
            </form>`;

const replaceForm = `            <!-- Voice Live & Chat Input Form -->
            <form onsubmit="handleCopilotSubmit(event)"
              style="display: flex; gap: 10px; align-items: center; padding: 12px 18px; background: #121212; border-top: 1px solid var(--border-subtle);">
              <button type="button" id="liveMicBtn" class="btn btn-outline" onclick="toggleGeminiLive()"
                title="Start Realtime Voice Conversation with Gemini Live"
                style="display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 50%; padding: 0; font-size: 18px; border-color: rgba(25,240,196,0.4); color: var(--teal); transition: all 0.3s ease;">
                🎙️
              </button>
              <span id="liveStatusBadge" style="display: none; font-size: 11px; font-family: 'JetBrains Mono', monospace; padding: 4px 10px; border-radius: 12px; background: rgba(25,240,196,0.15); color: var(--teal); border: 1px solid var(--teal);">
                ● Live
              </span>
              <input type="text" id="copilotInput" class="form-control" style="flex: 1;"
                placeholder="Ask a workplace question, query policy rules, or click mic to speak..."
                autocomplete="off">
              <button type="submit" class="btn btn-primary" id="copilotSendBtn">Send</button>
            </form>`;

if (!s.includes(targetForm)) {
  console.error('Target form not found in public/app.html');
  process.exit(1);
}
s = s.replace(targetForm, replaceForm);

// 2. Update checkGeminiStatus
const targetStatus = `    async function checkGeminiStatus() {
      try {
        const res = await fetch('/api/v2/copilot/status');
        const data = await res.json();
        if (data.success) {
          const badge = document.getElementById('copilotStatusText');
          if (badge) {
            badge.textContent = data.hasApiKey ? 'Google Gemini 2.0 Flash (Live Server)' : 'Google Gemini 2.0 Neural Engine (Fast Mode)';
          }
        }
      } catch (e) {}
    }`;

const replaceStatus = `    async function checkGeminiStatus() {
      try {
        const res = await fetch('/api/v2/copilot/status');
        const data = await res.json();
        if (data.success) {
          const badge = document.getElementById('copilotStatusText');
          if (badge) {
            if (data.liveAvailable) {
              badge.textContent = 'Google Gemini Live (Voice & Text Ready)';
            } else if (data.hasApiKey) {
              badge.textContent = 'Google Gemini (text mode)';
            } else {
              badge.textContent = 'Neural RAG (Fast Mode)';
            }
          }
          const micBtn = document.getElementById('liveMicBtn');
          if (micBtn) {
            if (data.hasApiKey) {
              micBtn.style.opacity = '1';
              micBtn.title = 'Start Spoken Voice Conversation with Gemini Live';
            } else {
              micBtn.style.opacity = '0.75';
              micBtn.title = 'Voice requires GEMINI_API_KEY in server environment.';
            }
          }
        }
      } catch (e) {}
    }`;

if (!s.includes(targetStatus)) {
  console.error('Target status not found in public/app.html');
  process.exit(1);
}
s = s.replace(targetStatus, replaceStatus);

// 3. Append the Gemini Live Voice Engine right after checkGeminiStatus
const liveEngineCode = `

    // =========================================================================
    // GEMINI LIVE VOICE ENGINE (REAL-TIME SPOKEN AUDIO + POLICY TOOL GROUNDING)
    // =========================================================================
    let liveState = {
      active: false,
      connecting: false,
      speaking: false,
      listening: false,
      session: null,
      audioContext: null,
      mediaStream: null,
      scriptProcessor: null,
      playContext: null,
      playQueue: [],
      isPlaying: false,
      currentSource: null,
      nextPlayTime: 0,
      userTranscript: '',
      aiTranscript: ''
    };

    function updateLiveUI(state, text) {
      const btn = document.getElementById('liveMicBtn');
      const badge = document.getElementById('liveStatusBadge');
      if (!btn || !badge) return;

      if (state === 'idle') {
        btn.innerHTML = '🎙️';
        btn.style.background = 'transparent';
        btn.style.borderColor = 'rgba(25,240,196,0.4)';
        btn.style.color = 'var(--teal)';
        btn.style.boxShadow = 'none';
        badge.style.display = 'none';
      } else if (state === 'connecting') {
        btn.innerHTML = '⏳';
        btn.style.background = 'rgba(255,194,74,0.15)';
        btn.style.borderColor = 'var(--amber)';
        btn.style.color = 'var(--amber)';
        btn.style.boxShadow = '0 0 15px rgba(255,194,74,0.5)';
        badge.style.display = 'inline-block';
        badge.style.background = 'rgba(255,194,74,0.15)';
        badge.style.color = 'var(--amber)';
        badge.style.borderColor = 'var(--amber)';
        badge.textContent = text || 'Connecting...';
      } else if (state === 'listening') {
        btn.innerHTML = '⏹️';
        btn.style.background = 'rgba(25,240,196,0.2)';
        btn.style.borderColor = 'var(--teal)';
        btn.style.color = 'var(--teal)';
        btn.style.boxShadow = '0 0 20px rgba(25,240,196,0.6)';
        badge.style.display = 'inline-block';
        badge.style.background = 'rgba(255,194,74,0.15)';
        badge.style.color = 'var(--teal)';
        badge.style.borderColor = 'var(--teal)';
        badge.textContent = '● Listening...';
      } else if (state === 'speaking') {
        btn.innerHTML = '⏹️';
        btn.style.background = 'rgba(124,92,255,0.2)';
        btn.style.borderColor = 'var(--a)';
        btn.style.color = '#c4b5fd';
        btn.style.boxShadow = '0 0 20px rgba(124,92,255,0.7)';
        badge.style.display = 'inline-block';
        badge.style.background = 'rgba(124,92,255,0.15)';
        badge.style.color = '#c4b5fd';
        badge.style.borderColor = 'var(--a)';
        badge.textContent = '🔊 Speaking...';
      } else if (state === 'error') {
        btn.innerHTML = '⚠️';
        btn.style.background = 'rgba(255,59,92,0.15)';
        btn.style.borderColor = 'var(--red)';
        btn.style.color = 'var(--red)';
        badge.style.display = 'inline-block';
        badge.style.background = 'rgba(255,59,92,0.15)';
        badge.style.color = 'var(--red)';
        badge.style.borderColor = 'var(--red)';
        badge.textContent = text || 'Live Error';
      }
    }

    async function toggleGeminiLive() {
      if (liveState.active || liveState.connecting) {
        stopGeminiLive('User stopped session.');
      } else {
        await startGeminiLive();
      }
    }

    async function startGeminiLive() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not supported by your browser or requires a secure context (https or localhost).');
        return;
      }

      liveState.connecting = true;
      updateLiveUI('connecting', 'Requesting Token...');

      try {
        const tokenRes = await fetch('/api/v2/copilot/live/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          }
        });

        if (tokenRes.status === 503) {
          const errData = await tokenRes.json();
          updateLiveUI('idle');
          liveState.connecting = false;
          appendCopilotMsg('🎙️ <strong>Gemini Live Voice Mode:</strong> ' + escapeHtml(errData.error || 'Gemini API key is not configured.') + '<br><br><span style="color:var(--text-dim); font-size:12px;">Text-based AI Copilot is fully active. To enable live voice streaming, add a valid GEMINI_API_KEY in server .env file.</span>', 'ai');
          return;
        }

        const tokenData = await tokenRes.json();
        if (!tokenData.success || !tokenData.token) {
          throw new Error(tokenData.error || 'Failed to acquire live ephemeral token');
        }

        updateLiveUI('connecting', 'Connecting Gemini Live...');

        const genaiModule = await import('/gemini-web.mjs');
        const { GoogleGenAI, Modality } = genaiModule;

        const liveAi = new GoogleGenAI({
          apiKey: tokenData.token,
          httpOptions: { apiVersion: 'v1alpha' }
        });

        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        liveState.mediaStream = micStream;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        liveState.playContext = new AudioCtx({ sampleRate: 24000 });
        if (liveState.playContext.state === 'suspended') {
          await liveState.playContext.resume();
        }
        liveState.playQueue = [];
        liveState.nextPlayTime = 0;
        liveState.isPlaying = false;

        const session = await liveAi.live.connect({
          model: tokenData.model || 'gemini-2.0-flash',
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
              parts: [{ text: tokenData.systemInstruction }]
            },
            tools: tokenData.tools || []
          },
          callbacks: {
            onopen: () => {
              liveState.active = true;
              liveState.connecting = false;
              updateLiveUI('listening');
              appendCopilotMsg('<span style="color:var(--teal); font-family:\\'JetBrains Mono\\';">🎙️ Gemini Live voice session active. Speak your question now...</span>', 'ai');
              startMicStreaming(session, micStream);
            },
            onmessage: async (event) => {
              await handleLiveServerMessage(event, session);
            },
            onerror: (err) => {
              console.warn('[Gemini Live Error]', err);
              stopGeminiLive('Session closed with error.');
            },
            onclose: () => {
              stopGeminiLive('Session closed.');
            }
          }
        });

        liveState.session = session;

      } catch (err) {
        console.error('[Gemini Live Launch Error]', err);
        liveState.connecting = false;
        liveState.active = false;
        updateLiveUI('error', 'Error');
        setTimeout(() => updateLiveUI('idle'), 3000);
        appendCopilotMsg('⚠️ Voice connection error: ' + escapeHtml(err.message), 'ai');
      }
    }

    function startMicStreaming(session, stream) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const micContext = new AudioCtx({ sampleRate: 16000 });
        liveState.audioContext = micContext;

        const sourceNode = micContext.createMediaStreamSource(stream);
        const processorNode = micContext.createScriptProcessor(4096, 1, 1);
        liveState.scriptProcessor = processorNode;

        processorNode.onaudioprocess = (e) => {
          if (!liveState.active) return;
          const inputData = e.inputBuffer.getChannelData(0);

          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          const bytes = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Audio = btoa(binary);

          try {
            session.sendRealtimeInput({
              audio: {
                data: base64Audio,
                mimeType: 'audio/pcm;rate=16000'
              }
            });
          } catch (sendErr) {
            console.warn('[Live sendRealtimeInput err]', sendErr.message);
          }
        };

        sourceNode.connect(processorNode);
        processorNode.connect(micContext.destination);
      } catch (err) {
        console.error('[Mic Streaming Setup Err]', err);
        stopGeminiLive('Could not initialize microphone audio pipeline');
      }
    }

    async function handleLiveServerMessage(msg, session) {
      if (!msg) return;

      if (msg.serverContent && msg.serverContent.interrupted) {
        clearAudioQueue();
        updateLiveUI('listening');
        return;
      }

      if (msg.serverContent && msg.serverContent.inputTranscription && msg.serverContent.inputTranscription.text) {
        const userText = msg.serverContent.inputTranscription.text;
        liveState.userTranscript += ' ' + userText;
        appendCopilotMsg(escapeHtml(userText), 'user');
        saveLiveTranscript('user', userText);
      }

      if (msg.serverContent && msg.serverContent.modelTurn && msg.serverContent.modelTurn.parts) {
        for (const part of msg.serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.data) {
            queueIncomingAudio(part.inlineData.data);
            updateLiveUI('speaking');
          }
          if (part.text) {
            liveState.aiTranscript += ' ' + part.text;
            appendCopilotMsg(escapeHtml(part.text), 'ai');
          }
        }
      }

      if (msg.serverContent && msg.serverContent.turnComplete) {
        if (liveState.aiTranscript.trim()) {
          saveLiveTranscript('assistant', liveState.aiTranscript.trim());
          liveState.aiTranscript = '';
        }
      }

      if (msg.toolCall && msg.toolCall.functionCalls) {
        for (const call of msg.toolCall.functionCalls) {
          if (call.name === 'search_company_policy') {
            const queryArg = (call.args && call.args.query) ? call.args.query : 'policy guidelines';
            appendCopilotMsg('🔎 <em>Consulting Knowledge Base: "' + escapeHtml(queryArg) + '"...</em>', 'ai');

            try {
              const toolRes = await fetch('/api/v2/copilot/live/tool-search', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify({ query: queryArg })
              });
              const toolData = await toolRes.json();
              const responseOutput = toolData.result || 'No matching policy found.';

              session.sendToolResponse({
                functionResponses: [
                  {
                    id: call.id,
                    name: call.name,
                    response: { output: responseOutput }
                  }
                ]
              });
            } catch (toolErr) {
              session.sendToolResponse({
                functionResponses: [
                  {
                    id: call.id,
                    name: call.name,
                    response: { output: 'Error retrieving policy documents: ' + toolErr.message }
                  }
                ]
              });
            }
          }
        }
      }
    }

    function queueIncomingAudio(base64Pcm) {
      try {
        const binary = atob(base64Pcm);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const ctx = liveState.playContext;
        if (!ctx) return;

        const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const currentTime = ctx.currentTime;
        if (liveState.nextPlayTime < currentTime) {
          liveState.nextPlayTime = currentTime;
        }

        const sourceNode = ctx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(ctx.destination);
        sourceNode.start(liveState.nextPlayTime);
        liveState.nextPlayTime += audioBuffer.duration;

        liveState.currentSource = sourceNode;
        sourceNode.onended = () => {
          if (ctx.currentTime >= liveState.nextPlayTime - 0.05) {
            updateLiveUI('listening');
          }
        };
      } catch (err) {
        console.warn('[Audio playback queue err]', err);
      }
    }

    function clearAudioQueue() {
      if (liveState.currentSource) {
        try { liveState.currentSource.stop(); } catch (e) {}
      }
      liveState.playQueue = [];
      if (liveState.playContext) {
        liveState.nextPlayTime = liveState.playContext.currentTime;
      }
    }

    async function saveLiveTranscript(role, content) {
      try {
        await fetch('/api/v2/copilot/live/transcript', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify({ role, content })
        });
      } catch (e) {}
    }

    function stopGeminiLive(reason) {
      liveState.active = false;
      liveState.connecting = false;
      clearAudioQueue();

      if (liveState.mediaStream) {
        liveState.mediaStream.getTracks().forEach(t => t.stop());
        liveState.mediaStream = null;
      }
      if (liveState.scriptProcessor) {
        try { liveState.scriptProcessor.disconnect(); } catch (e) {}
        liveState.scriptProcessor = null;
      }
      if (liveState.audioContext) {
        try { liveState.audioContext.close(); } catch (e) {}
        liveState.audioContext = null;
      }
      if (liveState.session) {
        try { liveState.session.conn.close(); } catch (e) {}
        liveState.session = null;
      }

      updateLiveUI('idle');
    }
`;

s = s.replace(replaceStatus, replaceStatus + liveEngineCode);

fs.writeFileSync('public/app.html', s, 'utf8');
fs.writeFileSync('app.html', s, 'utf8');
console.log('Successfully updated public/app.html and app.html!');

