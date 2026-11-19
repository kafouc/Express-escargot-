import { defineConfig } from 'vite';

/** Vrai quand le serveur tourne dans GitHub Codespaces. */
const inCodespaces = process.env.CODESPACES === 'true';

/** Codespaces publie le jeu sur une adresse du type https://<nom>-5173.app.github.dev. */
const allowedHosts = ['.app.github.dev', '.github.dev', 'localhost'];

export default defineConfig({
  // Chemins relatifs : le build fonctionne aussi dans un sous-dossier (portails web, Capacitor).
  base: './',
  // `host: true` rend le serveur accessible depuis Codespaces et depuis un téléphone sur le même Wi-Fi.
  server: {
    host: true,
    port: 5173,
    allowedHosts,
    // Dans Codespaces, le rechargement à chaud passe par le port HTTPS public (443).
    hmr: inCodespaces ? { clientPort: 443 } : undefined,
  },
  preview: { host: true, port: 4173, allowedHosts },
  build: { target: 'es2022' },
});
