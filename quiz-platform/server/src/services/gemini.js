const endpoint = () => `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`;
export async function askGemini(prompt) {
  const response = await fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }) });
  if (!response.ok) throw Object.assign(new Error('Gemini request failed'), { status: 502 });
  const data = await response.json();
  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
}
