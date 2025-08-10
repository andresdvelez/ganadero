import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  if (process.env.ALLOW_DEV_UNAUTH === "1") {
    return {
      prisma,
      userId: "dev-user",
      headers: opts.headers,
    } as const;
  }

  let userId: string | null = null;
  try {
    const res = await auth();
    userId = res.userId;
  } catch (_e) {
    // If Clerk middleware is not configured or we are offline, leave userId as null.
    // Client should queue writes locally and sync when online.
  }

  return {
    prisma,
    userId,
    headers: opts.headers,
  };
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
    // Permitir bypass en desarrollo si ALLOW_DEV_UNAUTH=1
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
