import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Static SPA — no server code. Deploys to any static host (Vercel/Netlify/GH Pages).
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
