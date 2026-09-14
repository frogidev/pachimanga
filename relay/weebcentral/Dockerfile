FROM node:22-alpine

WORKDIR /app
COPY server.mjs ./server.mjs

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787

USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
