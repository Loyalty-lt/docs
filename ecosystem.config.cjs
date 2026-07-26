module.exports = {
  apps: [
    {
      name: 'docs.loyalty.lt',
      // Docusaurus ships its own static server; using it rather than the `serve`
      // package keeps trailing-slash and 404 behaviour identical to `npm run build`.
      script: 'node_modules/.bin/docusaurus',
      args: 'serve --port 3098 --host 0.0.0.0 --no-open',
      cwd: '/var/www/vhosts/loyalty.lt/docs.loyalty.lt',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      // Serving pre-built static files: the footprint is flat and small.
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3098,
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
    {
      name: 'docs.loyalty.lt-chat',
      // Separate process, not a Docusaurus plugin: it is the only thing that
      // holds LITELLM_API_KEY, so it cannot live in the browser bundle. See
      // server/chat-proxy.mjs. LITELLM_API_KEY must be set on the server —
      // pm2 will not read a .env file automatically, export it in the shell
      // profile or a `pm2 set` / ecosystem `env_file` before starting this.
      script: 'server/chat-proxy.mjs',
      cwd: '/var/www/vhosts/loyalty.lt/docs.loyalty.lt',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        CHAT_PROXY_PORT: 3102,
        AI_BASE_URL: 'https://ai.loyalty.lt',
        AI_MODEL: 'qwen3-30b-a3b',
        CHAT_PROXY_ALLOWED_ORIGINS: 'https://docs.loyalty.lt',
      },
      error_file: './logs/pm2-chat-error.log',
      out_file: './logs/pm2-chat-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },
  ],
};
