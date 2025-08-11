import { createTRPCRouter } from "../trpc";
import { animalRouter } from "./animal";
import { syncRouter } from "./sync";
import { aiRouter } from "./ai";
import { orgRouter } from "./org";
import { deviceRouter } from "./device";
import { healthRouter } from "./health";
import { milkRouter } from "./milk";

export const appRouter = createTRPCRouter({
  animal: animalRouter,
  sync: syncRouter,
  ai: aiRouter,
  org: orgRouter,
  device: deviceRouter,
  health: healthRouter,
  milk: milkRouter,
});

export type AppRouter = typeof appRouter;
