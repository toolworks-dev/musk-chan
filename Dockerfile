FROM oven/bun:1

RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    python3 \
    build-essential \
    python3-dev \
    libtool \
    autoconf \
    automake \
    libopus-dev \
    make \
    g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN bun install

COPY config.json ./

COPY . .

CMD ["bun", "run", "index.js"] 