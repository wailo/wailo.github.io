import type { FeedbackProviderConfig } from './FeedbackProvider'

// Choose the provider here; no runtime settings panel or browser-stored secrets.
export const feedbackProviderOptions: Record<'ollama' | 'openai', FeedbackProviderConfig> = {
  ollama: {
    provider: 'ollama',
    endpoint: 'http://127.0.0.1:11434/api/chat',
    model: 'flightsimModel:latest', // Must exist on your Ollama server.
    timeoutMs: 120_000,
  },
  openai: {
    provider: 'openai',
    // Set this to your authenticated Responses API proxy. No proxy is added here.
    // The proxy supplies the OpenAI key server-side and returns the raw Responses JSON.
    endpoint: '',
    model: '', // Set to a structured-output-capable model available to your account.
    timeoutMs: 60_000,
    // Optional application-session headers for the proxy; NEVER an OpenAI API key.
    // headers: () => ({ Authorization: `Bearer ${yourApplicationSessionToken}` }),
  },
}

export const feedbackProviderConfig = feedbackProviderOptions.ollama
