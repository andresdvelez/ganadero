import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function proxy(req: NextRequest, ctx: { params: { path: string[] } }) {
  let base =
    process.env.NEXT_PUBLIC_OLLAMA_HOST ||
    process.env.OLLAMA_SERVER_URL ||
    "http://127.0.0.1:11434";
  // Evitar bucles si la var apunta a una ruta relativa (/api/ollama)
  if (!/^https?:\/\//i.test(base)) {
    const port = Number(process.env.NEXT_PUBLIC_LLAMA_PORT || 11434);
    base = `http://127.0.0.1:${port}`;
  }
  const targetUrl = `${base.replace(/\/$/, "")}/${ctx.params.path.join("/")}`;

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
    cache: "no-store",
    // Node.js fetch soporta 'duplex' para streaming en requests con cuerpo.
    // @ts-expect-error Node fetch extensions
    duplex: "half",
  };

  try {
    const res = await fetch(targetUrl, init as any);
    const headers = new Headers(res.headers);
    headers.set("access-control-allow-origin", "*");
    // Si la respuesta es streaming (Transfer-Encoding: chunked), devolver el body como ReadableStream
    if (res.body) {
      return new NextResponse(res.body as any, { status: res.status, headers });
    }
    const body = await res.arrayBuffer();
    return new NextResponse(body, { status: res.status, headers });
  } catch (e: any) {
    try {
      console.error("/api/ollama proxy error:", e?.message || e);
    } catch {}
    return NextResponse.json(
      { error: e?.message || "Proxy error" },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
