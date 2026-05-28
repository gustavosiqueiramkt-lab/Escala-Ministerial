import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.svg", "icon-192.svg", "icon-512.svg"],
      manifest: {
        name: "Escala Ministerial",
        short_name: "Escala",
        description: "Gestão de louvor e técnica ministerial para igrejas",
        theme_color: "#099bc0",
        background_color: "#f8fafc",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        lang: "pt-BR",
        categories: ["productivity", "utilities"],
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Novo Culto",
            url: "/services/new",
            description: "Criar um novo culto",
          },
          {
            name: "Minha Escala",
            url: "/my-schedule",
            description: "Ver minha escala",
          },
        ],
      },
      workbox: {
        // Cache estático (JS, CSS, fontes)
        globPatterns: ["**/*.{js,css,html,ico,svg,woff,woff2}"],
        // Estratégia: rede primeiro para navegação, cache para assets
        runtimeCaching: [
          {
            // Supabase API — NetworkFirst: tenta rede, cai no cache se offline
            urlPattern: ({ url }) => url.hostname.includes("supabase.co"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24h
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Google Fonts
            urlPattern: ({ url }) => url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 ano
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Desabilita service worker em desenvolvimento
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa as libs pesadas em chunks próprios (carregados sob demanda)
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": ["lucide-react", "recharts"],
          "vendor-form": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-date": ["date-fns", "react-day-picker"],
        },
      },
    },
  },
}));
