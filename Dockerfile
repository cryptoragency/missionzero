# Mission Zero in a container: it runs where the customer's code lives; only the model calls leave (and with open
# weights, those can stay on the customer's own endpoint: MZ_BASE_URL). The .env is never copied into the image.
#   docker build -t mission-zero .
#   docker run --rm --env-file .env -v "$PWD/evidence:/app/evidence" -v "$PWD/memory:/app/memory" mission-zero src/run.js "your goal" 4 3
#   docker run --rm --entrypoint npm mission-zero test      (the test suite: no network, no model call)
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
ENTRYPOINT ["node", "--env-file-if-exists=.env"]
CMD ["src/check-key.js"]
