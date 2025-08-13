/*import OpenAI from "openai"

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY, // Using Vite's environment variable format
  dangerouslyAllowBrowser: true, // Only for development - in production use server-side API calls
})

// Define the system prompt to provide context about AAMU
const SYSTEM_PROMPT = `You are a helpful course and career assistant for Alabama A&M University students.
You provide accurate information about course registration, academic requirements, career paths, and university resources.
Be friendly, concise, and helpful. If you don't know something specific about AAMU, acknowledge that and provide general guidance.
Some key information about AAMU:
- Located in Normal, Alabama
- A historically black university founded in 1875
- Known for programs in STEM, agriculture, education, and business
- Semester-based academic calendar with Fall, Spring, and Summer terms
- Registration typically opens several months before the semester starts
- Students need to meet with academic advisors before registration
`

// Function to get streaming chat completion from OpenAI
export async function getStreamingChatCompletion(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
) {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    })

    let fullResponse = ""

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ""
      if (content) {
        fullResponse += content
        onChunk(content)
      }
    }

    return fullResponse
  } catch (error) {
    console.error("Error getting streaming chat completion:", error)
    throw error
  }
}
*/

import OpenAI from "openai";

export type ApiProvider = "openai" | "backend";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // dev only
});

const SYSTEM_PROMPT = `You are a helpful course and career assistant for Alabama A&M University students.
You provide accurate information about course registration, academic requirements, career paths, and university resources.
Be friendly, concise, and helpful. If you don't know something specific about AAMU, acknowledge that and provide general guidance.
Some key information about AAMU:
- Located in Normal, Alabama
- A historically black university founded in 1875
- Known for programs in STEM, agriculture, education, and business
- Semester-based academic calendar with Fall, Spring, and Summer terms
- Registration typically opens several months before the semester starts
- Students need to meet with academic advisors before registration
`;

const getBackendBaseUrl = () =>
  (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined) || "/api";

export function getCurrentProvider(): ApiProvider {
  return (import.meta.env.VITE_API_PROVIDER as ApiProvider) === "backend"
    ? "backend"
    : "openai";
}

export async function getStreamingChatCompletion(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void
): Promise<string> {
  const provider = getCurrentProvider();
  return provider === "backend"
    ? getBackendStreaming(messages, onChunk)
    : getOpenAIStreaming(messages, onChunk);
}

export async function clearConversationMemory(): Promise<void> {
  if (getCurrentProvider() !== "backend") return;
  const res = await fetch(`${getBackendBaseUrl()}/clear-memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Backend memory clear failed: ${res.statusText}`);
}

// ---------- OpenAI (browser) path: unchanged ----------
async function getOpenAIStreaming(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ],
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      full += content;
      onChunk(content);
    }
  }
  return full;
}

// ---------- Backend path: prefer SSE, fallback to JSON ----------
async function getBackendStreaming(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void
): Promise<string> {
  const base = getBackendBaseUrl();
  const question =
    [...messages].reverse().find((m) => m.role === "user")?.content?.trim() ||
    ""; // latest user message

  // Try SSE stream first
  try {
    const sseRes = await fetch(`${base}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!sseRes.ok) {
      throw new Error(`SSE failed: ${sseRes.status} ${sseRes.statusText}`);
    }

    // If server didn't return a stream, fall back to JSON below
    if (!sseRes.body) throw new Error("No response body (no stream)");

    const reader = sseRes.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let carry = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const combined = carry + chunk;
      const lines = combined.split(/\r?\n/);
      carry = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            carry = "";
            reader.cancel().catch(() => {});
            return full;
          }
          full += data;
          onChunk(data);
        } else {
          // raw text fallback line
          full += trimmed;
          onChunk(trimmed);
        }
      }
    }

    // flush any leftover raw text
    if (carry && !carry.startsWith("data:")) {
      full += carry;
      onChunk(carry);
    }
    return full;
  } catch {
    // Fallback: non-stream JSON endpoint
    const jsonRes = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!jsonRes.ok) {
      const text = await jsonRes.text().catch(() => "");
      throw new Error(`Backend chat failed: ${jsonRes.status} ${text}`);
    }
    const { answer } = await jsonRes.json();
    const text = typeof answer === "string" ? answer : JSON.stringify(answer);
    onChunk(text); // push whole answer at once
    return text;
  }
}
