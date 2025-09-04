import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getPayment(accessToken: string, id: string) {
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`mp payment ${id} ${r.status}`);
  return r.json();
}

async function getPreference(accessToken: string, prefId: string) {
  const r = await fetch(`https://api.mercadopago.com/checkout/preferences/${prefId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`mp preference ${prefId} ${r.status}`);
  return r.json();
}

async function getPreapproval(accessToken: string, id: string) {
  const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`mp preapproval ${id} ${r.status}`);
  return r.json();
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ ok: false, error: "MP not configured" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const topic = body?.type || body?.action || body?.topic; // MP sends various fields
    const dataId = body?.data?.id || body?.resource?.id || body?.id;

    // Only handle payment approved events
    if (!dataId) return NextResponse.json({ ok: true });

    let orgId: string | null = null;
    let planKey: string | null = null;
    let qtyUsers = 1;
    let qtyDevices = 1;
    let period: "MONTHLY" | "ANNUAL" = "MONTHLY";

    if (topic && String(topic).includes("payment")) {
      const payment = await getPayment(accessToken, String(dataId));
      // If not approved, ignore
      const status = payment?.status;
      const preferenceId = payment?.additional_info?.items?.[0]?.id || payment?.preference_id || payment?.order?.id || payment?.metadata?.preference_id;
      if (status !== "approved" || !preferenceId) {
        return NextResponse.json({ ok: true, ignored: true });
      }
      const pref = await getPreference(accessToken, String(preferenceId));
      const meta = pref?.metadata || {};
      orgId = meta.orgId || null;
      planKey = meta.planKey || null;
      qtyUsers = Number(meta.qtyUsers || 1);
      qtyDevices = Number(meta.qtyDevices || 1);
      period = (meta.period === "ANNUAL" ? "ANNUAL" : "MONTHLY");

      if (!orgId || !planKey) {
        return NextResponse.json({ ok: true, ignored: true, reason: "no metadata" });
      }

      // Idempotency: if subscription already active for this providerRef, return
      const existing = await prisma.subscription.findFirst({ where: { providerRef: String(preferenceId) } });
      if (existing && existing.status === "ACTIVE") {
        return NextResponse.json({ ok: true, idempotent: true });
      }

      const now = new Date();
      const ends = new Date(now.getTime() + (period === "ANNUAL" ? 365 : 30) * 24 * 60 * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        // Upsert subscription
        await tx.subscription.upsert({
          where: { providerRef: String(preferenceId) },
          update: {
            status: "ACTIVE" as any,
            startsAt: now,
            endsAt: ends,
            qtyUsers,
            qtyDevices,
          },
          create: {
            orgId: orgId!,
            userId: (existing?.userId) || (await tx.organization.findUnique({ where: { id: orgId! } }))!.createdByUserId,
            provider: "MERCADO_PAGO" as any,
            providerRef: String(preferenceId),
            status: "ACTIVE" as any,
            period: period as any,
            planKey: planKey!,
            qtyUsers,
            qtyDevices,
            startsAt: now,
            endsAt: ends,
          },
        });

        // Initialize/Update usage caps (do not reset counters)
        await tx.orgUsage.upsert({
          where: { orgId: orgId! },
          update: { users: Math.max(qtyUsers, 1), devices: Math.max(qtyDevices, 1) },
          create: { orgId: orgId!, users: Math.max(qtyUsers, 1), devices: Math.max(qtyDevices, 1), animals: 0 },
        });
      });
    }

    // Handle preapproval (subscriptions) events
    if (topic && String(topic).includes("preapproval")) {
      const preapproval = await getPreapproval(accessToken, String(dataId));
      const status = preapproval?.status; // authorized, paused, cancelled
      const metadata = preapproval?.metadata || {};
      const prefId = preapproval?.preapproval_plan_id || preapproval?.auto_recurring?.preapproval_plan_id;
      orgId = metadata.orgId || preapproval?.external_reference?.split("|")?.[0] || null;
      planKey = metadata.planKey || preapproval?.reason || null;
      qtyUsers = Number(metadata.qtyUsers || 1);
      qtyDevices = Number(metadata.qtyDevices || 1);
      period = (metadata.period === "ANNUAL" || preapproval?.auto_recurring?.frequency === 12) ? "ANNUAL" : "MONTHLY";

      if (!orgId) return NextResponse.json({ ok: true, ignored: true, reason: "no orgId" });

      const now = new Date();
      const ends = new Date(now.getTime() + (period === "ANNUAL" ? 365 : 30) * 24 * 60 * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        if (status === "authorized") {
          await tx.subscription.upsert({
            where: { providerRef: String(dataId) },
            update: {
              status: "ACTIVE" as any,
              startsAt: now,
              endsAt: ends,
              qtyUsers,
              qtyDevices,
            },
            create: {
              orgId: orgId!,
              userId: (await tx.organization.findUnique({ where: { id: orgId! } }))!.createdByUserId,
              provider: "MERCADO_PAGO" as any,
              providerRef: String(dataId),
              status: "ACTIVE" as any,
              period: period as any,
              planKey: planKey || "licencia",
              qtyUsers,
              qtyDevices,
              startsAt: now,
              endsAt: ends,
            },
          });
          await tx.orgUsage.upsert({
            where: { orgId: orgId! },
            update: { users: Math.max(qtyUsers, 1), devices: Math.max(qtyDevices, 1) },
            create: { orgId: orgId!, users: Math.max(qtyUsers, 1), devices: Math.max(qtyDevices, 1), animals: 0 },
          });
        }
        if (status === "paused" || status === "cancelled") {
          await tx.subscription.updateMany({
            where: { orgId: orgId!, providerRef: String(dataId) },
            data: { status: "CANCELED" as any, canceledAt: now },
          });
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}


