# Mission Zero in a container: it runs where the customer's code lives; only the model calls leave (and with open
# weights, those can stay on the customer's own endpoint: MZ_BASE_URL). The .env is never copied into the image.
#   docker build -t mission-zero .
#   docker run --rm --env-file .env -v "$PWD/evidence:/app/evidence" -v "$PWD/memory:/app/memory" mission-zero src/run.js "your goal" 4 3
#   docker run --rm --entrypoint npm mission-zero test      (the test suite: no network, no model call)
# The API (POST /api/verify), locked down: published on this machine only, read-only, no capabilities, no privilege gain:
#   docker run -d --name mz-api --env-file .env -e MZ_API_KEY=<32+ chars> -p 127.0.0.1:3000:3000 -v mz-memory:/app/memory -e MZ_DAILY_CAP_USD=5 \
#     --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges --pids-limit 128 --memory 512m \
#     mission-zero src/api.js
# Vision (--vision) needs Playwright and stays outside the image; voice uses the ffmpeg installed here.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production HOST=0.0.0.0
RUN useradd --create-home mz && mkdir -p evidence memory && chown -R mz /app
USER mz
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "--env-file-if-exists=.env"]
CMD ["src/check-key.js"]
