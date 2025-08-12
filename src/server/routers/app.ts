import { createTRPCRouter } from "../trpc";
import { animalRouter } from "./animal";
import { syncRouter } from "./sync";
import { aiRouter } from "./ai";
import { orgRouter } from "./org";
import { deviceRouter } from "./device";
import { healthRouter } from "./health";
import { milkRouter } from "./milk";
import { inventoryRouter } from "./inventory";
import { pastureRouter } from "./pasture";
import { financeRouter } from "./finance";
import { tasksRouter } from "./tasks";
import { sensorsRouter } from "./sensors";
import { locationsRouter } from "./locations";

export const appRouter = createTRPCRouter({
  animal: animalRouter,
  sync: syncRouter,
  ai: aiRouter,
  org: orgRouter,
  device: deviceRouter,
  health: healthRouter,
  milk: milkRouter,
  inventory: inventoryRouter,
  pasture: pastureRouter,
  finance: financeRouter,
  tasks: tasksRouter,
  sensors: sensorsRouter,
  locations: locationsRouter,
});

export type AppRouter = typeof appRouter;
