import { NextResponse } from "next/server";

export const runtime = "edge";

async function proxy(req: Request, params: { path: string[] }) {
  const base =
    process.env.OLLAMA_SERVER_URL || "https://ganadero-nine.vercel.app";
  const targetUrl = `${base.replace(/\/$/, "")}/${params.path.join("/")}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      "content-type": req.headers.get("content-type") || "application/json",
      accept: req.headers.get("accept") || "*/*",
      ...(req.headers.get("authorization")
        ? { authorization: req.headers.get("authorization") as string }
        : {}),
    },
    body: ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await req.arrayBuffer(),
  };

  try {
    const res = await fetch(targetUrl, init as any);
    const headers = new Headers(res.headers);
    headers.set("access-control-allow-origin", "*");

    const body = await res.arrayBuffer();
    return new NextResponse(body, { status: res.status, headers });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Proxy error" },
      { status: 502 }
    );
  }
}

export async function GET(req: Request, ctx: any) {
  return proxy(req, ctx.params);
}
export async function POST(req: Request, ctx: any) {
  return proxy(req, ctx.params);
}
