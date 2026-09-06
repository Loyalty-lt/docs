module.exports = {
  apps: [
    {
      name: 'docs.loyalty.lt',
      // Fumadocs is a Next.js app — serve the production build with `next start`.
      // Run `npm run build` first (its prebuild step regenerates the scoped
      // OpenAPI spec). Same port 3098 the old Docusaurus site used.
      script: 'node_modules/.bin/next',
      args: 'start --port 3098 --hostname 0.0.0.0',
      cwd: '/var/www/vhosts/loyalty.lt/docs.loyalty.lt',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 3098,
        // "Ask AI" uses the same AI gateway as api.loyalty.lt. Next loads `.env`
        // itself, so AI_API_KEY / AI_BASE_URL / AI_MODEL_STANDARD live there —
        // see .env.example. Without AI_API_KEY, /api/chat returns 503 and the
        // rest of the docs still work.
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },
  ],
};
