type Opts = {
  sourceLang?: string;
  targetLang: string;
};

export async function translate(text: string, opts: Opts) {
  const res = await fetch(process.env.LB_ENDPOINT!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      sourceLang: opts.sourceLang || "auto",
      targetLang: opts.targetLang
    })
  });
  if (!res.ok) throw new Error(`translate failed: ${res.status}`);
  const data = await res.json() as { translatedText: string; detectedLang?: string };
  return {
    text: data.translatedText,
    detectedLang: data.detectedLang || "auto"
  };
}
