import { initTRPC, TRPCError } from "@trpc/server";
import { auth, getAuth, verifyToken, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";
import type { NextRequest } from "next/server";

function decodeJwtNoVerify(
  token: string
): { sub?: string; iss?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf8")
    );
    return payload;
  } catch {
    return null;
  }
}

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  if (process.env.ALLOW_DEV_UNAUTH === "1") {
    // Farm context (dev)
    const farmIdHeader =
      opts.req.headers.get("x-farm-id") || opts.req.headers.get("X-FARM-ID");
    const farmId = farmIdHeader?.trim() || null;
    if (farmId) {
      try {
        await prisma.$executeRaw`SELECT set_config('app.current_farm', ${farmId}, true)`;
      } catch {}
    }
    return {
      prisma,
      userId: "dev-user",
      req: opts.req,
      farmId,
    } as const;
  }

  let userId: string | null = null;
  try {
    const a = await auth();
    userId = a.userId ?? null;
    if (!userId) {
      const { userId: uid } = getAuth(opts.req);
      userId = uid ?? null;
    }
  } catch (_e) {
    try {
      const { userId: uid } = getAuth(opts.req);
      userId = uid ?? null;
    } catch {}
  }

  // Try Authorization Bearer token and __session cookie if no user yet
  const cookieHeader = opts.req.headers.get("cookie") || "";
  const authHeader =
    opts.req.headers.get("authorization") ||
    opts.req.headers.get("Authorization") ||
    "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const cookieToken = (() => {
    try {
      const m = cookieHeader.match(/(?:^|; )__session=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    } catch {
      return null;
    }
  })();

  const candidateTokens = [bearer, cookieToken].filter(Boolean) as string[];

  if (!userId && candidateTokens.length > 0) {
    for (const token of candidateTokens) {
      // First, try official verification
      try {
        const verifyOptions: any = {
          secretKey: process.env.CLERK_SECRET_KEY || undefined,
        };
        const configuredIssuer =
          process.env.CLERK_ISSUER || process.env.NEXT_PUBLIC_CLERK_ISSUER;
        if (configuredIssuer) verifyOptions.issuer = configuredIssuer;
        const payload = await verifyToken(token, verifyOptions);
        const sub = (payload as any)?.sub as string | undefined;
        if (sub) {
          userId = sub;
          break;
        }
      } catch {}
      // Fallback: decode without verify (basic checks only)
      try {
        const payload = decodeJwtNoVerify(token);
        if (payload?.sub && payload?.exp && payload.exp * 1000 > Date.now()) {
          const issuer = payload.iss || "";
          const allowedIssuer = process.env.CLERK_ISSUER || "";
          const issuerLooksValid =
            issuer.includes("clerk") ||
            (allowedIssuer && issuer === allowedIssuer);
          if (issuerLooksValid) {
            userId = payload.sub;
            break;
          }
        }
      } catch {}
    }
  }

  // Ensure a User record exists for this Clerk user
  if (userId) {
    try {
      const existing = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      if (!existing) {
        // En este entorno, clerkClient es función
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const primaryEmailId = user.primaryEmailAddressId;
        const emailFromPrimary = user.emailAddresses?.find(
          (e) => e.id === primaryEmailId
        )?.emailAddress;
        const fallbackEmail = user.emailAddresses?.[0]?.emailAddress;
        const email =
          emailFromPrimary || fallbackEmail || `user_${userId}@ganado.ai`;
        const fullName =
          [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

        // Upsert por email: si existe, enlazar clerkId
        await prisma.user.upsert({
          where: { email },
          update: {
            clerkId: userId,
            name: fullName ?? undefined,
          },
          create: {
            clerkId: userId,
            email,
            name: fullName,
          },
        });
      }
    } catch (e) {
      // Swallow provisioning errors to avoid blocking auth; downstream routes may still handle not found
    }
  }

  // Farm context (header)
  const farmIdHeader =
    opts.req.headers.get("x-farm-id") || opts.req.headers.get("X-FARM-ID");
  const farmId = farmIdHeader?.trim() || null;
  if (farmId) {
    try {
      await prisma.$executeRaw`SELECT set_config('app.current_farm', ${farmId}, true)`;
    } catch {}
  }

  return {
    prisma,
    userId,
    req: opts.req,
    farmId,
  } as const;
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return {
      ...shape,
      data: {
        ...shape.data,
      },
    };
  },
});

export const createTRPCRouter = t.router;

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    if (process.env.ALLOW_DEV_UNAUTH === "1") {
      return next({
        ctx: {
          ...ctx,
          userId: "dev-user",
        },
      });
    }
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const router = t.router;
