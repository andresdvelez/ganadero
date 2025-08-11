import { initTRPC, TRPCError } from "@trpc/server";
import { auth, getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";
import type { NextRequest } from "next/server";

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  if (process.env.ALLOW_DEV_UNAUTH === "1") {
    return {
      prisma,
      userId: "dev-user",
      req: opts.req,
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

  return {
    prisma,
    userId,
    req: opts.req,
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
