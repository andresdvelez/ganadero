import { MetadataRoute } from "next";

export const dynamic = "force-static";
export const revalidate = 3600;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ganado AI",
    short_name: "GanadoAI",
    description: "Asistente ganadero offline con IA",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
