# طلبك معنا — صورة تشغيل. تتطلب قرصًا دائمًا مركّبًا على /data (قاعدة SQLite والنسخ الاحتياطية).
FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public
COPY scripts ./scripts
ENV NODE_ENV=production DATA_DIR=/data PORT=3000 TRUST_PROXY=1
VOLUME ["/data"]
EXPOSE 3000
USER node
CMD ["node", "--no-warnings", "server/index.js"]
