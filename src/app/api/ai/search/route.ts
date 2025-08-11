import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { query } = (await req.json().catch(() => ({}))) as {
      query?: string;
    };
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 1) Try DuckDuckGo Instant Answer (free, no key)
    let results: Array<{ title: string; url: string; snippet: string }> = [];
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        query
      )}&format=json&no_redirect=1&no_html=1&t=ganado-ai`;
      const ddgRes = await fetch(ddgUrl, {
        headers: { "User-Agent": "GanadoAI/1.0" },
      });
      if (ddgRes.ok) {
        const data = await ddgRes.json();
        if (data.AbstractText) {
          results.push({
            title: data.Heading || "Resumen",
            url: data.AbstractURL || "",
            snippet: data.AbstractText,
          });
        }
        if (Array.isArray(data.Results)) {
          for (const r of data.Results.slice(0, 5)) {
            if (r?.Text && r?.FirstURL) {
              results.push({ title: r.Text, url: r.FirstURL, snippet: r.Text });
            }
          }
        }
        if (Array.isArray(data.RelatedTopics)) {
          const pushTopic = (item: any) => {
            if (item?.Text) {
              results.push({
                title: item.Text,
                url: item.FirstURL || "",
                snippet: item.Text,
              });
            }
          };
          for (const item of data.RelatedTopics) {
            if (Array.isArray(item?.Topics))
              item.Topics.slice(0, 5).forEach(pushTopic);
            else pushTopic(item);
            if (results.length >= 12) break;
          }
        }
      }
    } catch {}

    // 2) Optional fallback to Tavily if configured and DDG gave no items
    if (results.length === 0 && process.env.TAVILY_API_KEY) {
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
          },
          body: JSON.stringify({
            query,
            search_depth: "basic",
            include_answer: true,
            max_results: 5,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          results = (data?.results || []).map((r: any) => ({
            title: r.title,
            url: r.url,
            snippet: r.content,
          }));
        }
      } catch {}
    }

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
