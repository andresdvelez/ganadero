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
import { breedingAdvRouter } from "./breeding";
import { mastitisRouter } from "./mastitis";
import { weightsRouter } from "./weights";
import { financeApRouter } from "./finance-ap";
import { alertsRouter } from "./alerts";
import { pasturesAdvRouter } from "./pastures-adv";
import { aiAssetsRouter } from "./ai-assets";
import { farmRouter } from "./farm";
import { billingRouter } from "./billing";

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
  farm: farmRouter,
  billing: billingRouter,
  // Phase 1 advanced routers
  breedingAdv: breedingAdvRouter,
  mastitis: mastitisRouter,
  weights: weightsRouter,
  financeAp: financeApRouter,
  alerts: alertsRouter,
  pasturesAdv: pasturesAdvRouter,
  aiAssets: aiAssetsRouter,
});

export type AppRouter = typeof appRouter;
