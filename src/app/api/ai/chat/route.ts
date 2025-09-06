import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 503 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const model =
      body?.model ||
      process.env.NEXT_PUBLIC_OPENROUTER_MODEL ||
      "deepseek/deepseek-r1-0528:free";
    const webSearch = body?.webSearch === true;

    // Optional: pass hint of webSearch to the model as a system prefix
    if (webSearch) {
      messages.unshift({
        role: "system",
        content:
          "El usuario habilitó 'búsqueda web'. Usa conocimiento actualizado y, si no estás seguro, indica fuentes. No inventes URLs.",
      });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL ||
          "https://app.ganado.co",
        "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "Ganado AI",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `OpenRouter error: ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || data?.content || "";

    return NextResponse.json({ content });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
