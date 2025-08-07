import { createTRPCRouter } from "../trpc";
import { animalRouter } from "./animal";

export const appRouter = createTRPCRouter({
  animal: animalRouter,
});

export type AppRouter = typeof appRouter;
