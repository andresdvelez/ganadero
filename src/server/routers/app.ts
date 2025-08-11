import { createTRPCRouter } from "../trpc";
import { animalRouter } from "./animal";
import { syncRouter } from "./sync";
import { aiRouter } from "./ai";
import { orgRouter } from "./org";
import { deviceRouter } from "./device";
import { healthRouter } from "./health";
import { milkRouter } from "./milk";
import { inventoryRouter } from "./inventory";

export const appRouter = createTRPCRouter({
  animal: animalRouter,
  sync: syncRouter,
  ai: aiRouter,
  org: orgRouter,
  device: deviceRouter,
  health: healthRouter,
  milk: milkRouter,
  inventory: inventoryRouter,
});

export type AppRouter = typeof appRouter;
