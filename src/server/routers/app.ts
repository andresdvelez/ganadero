import { createTRPCRouter } from "../trpc";
import { animalRouter } from "./animal";
import { syncRouter } from "./sync";
import { aiRouter } from "./ai";
import { orgRouter } from "./org";
import { deviceRouter } from "./device";

export const appRouter = createTRPCRouter({
  animal: animalRouter,
  sync: syncRouter,
  ai: aiRouter,
  org: orgRouter,
  device: deviceRouter,
});

export type AppRouter = typeof appRouter;
