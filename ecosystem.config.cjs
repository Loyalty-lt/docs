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
  ],
};
