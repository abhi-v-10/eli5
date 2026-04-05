importScripts("secrets.js"); // loads SECRETS global — file is gitignored

const API_KEY  = SECRETS.OPENAI_API_KEY;
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "EXPLAIN_TEXT") return false;

  explainText(message.text)
    .then((explanation) => sendResponse({ success: true, explanation }))
    .catch((err) => {
      console.error("[ELI5] explainText failed:", err);
      sendResponse({ success: false, error: err.message });
    });

  return true; // keep message port open for async response
});

async function explainText(text) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `You are an expert at simplifying complex text into ultra-short, clear explanations.\n\n` +
            `Your task:\n` +
            `- Extract ONLY the most important ideas from the text\n` +
            `- Discard minor details, filler, and repeated information\n` +
            `- Explain in plain, simple language a 5-year-old would understand\n` +
            `- Keep it SHORT — 3 to 10 lines maximum depending on the complexity of the text selected\n\n` +
            `Rules:\n` +
            `- Do NOT rewrite or paraphrase the original sentence by sentence\n` +
            `- Do NOT pad with extra context or background\n` +
            `- Focus on the core meaning only\n\n` +
            `Format (STRICT):\n` +
            `- 3 to 8 bullet points only maximum\n` +
            `- Start every bullet with "• " (bullet symbol + space)\n` +
            `- Each bullet on its OWN NEW LINE\n` +
            `- One short sentence per bullet, max 15 words\n` +
            `- Remove filler words\n` +
            `- Remove any words that are not necessary to understand the point\n` +
            `- Be direct and punchy, no fluff\n` +
            `- No dashes, no numbers, no markdown, no bold — plain text only\n\n`
        },
        {
          role: "user",
          content: `Explain this:\n\n"${text}"`,
        },
      ],
      temperature: 0.4,
      max_tokens: 200,
    }),
  });

  const data = await response.json();
  console.log("[ELI5] OpenAI raw response:", JSON.stringify(data));

  if (!response.ok) {
    throw new Error(data?.error?.message || `API error ${response.status}`);
  }

  const explanation = data?.choices?.[0]?.message?.content?.trim();
  if (!explanation) throw new Error("Empty response from OpenAI.");

  return explanation;
}
