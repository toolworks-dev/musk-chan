# Musk-Chan Discord Bot

A feature-rich Discord bot built with discord.js that allows you to play music from a Youtube Invidious instance in your Discord server.

## Features

- 🎵 Play music from YouTube (Uses Invidious Instance) and Soundcloud (Uses Soundcloud Client ID)
- 📑 Queue system with playlist support
- 🎮 Interactive song selection from search results
- 🔄 Queue management commands (clear, shuffle, skip)
- ⏯️ Playback controls (pause, stop)

## Commands

- `/play <query>` - Play a song from Youtube or Soundcloud
- `/queue` - Display the current music queue
- `/clear` - Clear the music queue (keeps current song)
- `/shuffle` - Shuffle the current queue
- `/next` - Skip to the next song
- `/pause` - Pause the current song
- `/stop` - Stop playback and clear queue

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Bun](https://bun.sh/) package manager
- Discord Bot Token
- Public or Private Invidious Instance
## Installation

1. Clone the repository:
```bash
git clone https://github.com/toolworks-dev/musk-chan.git
cd musk-chan
```

2. Install dependencies:
```bash
bun install
```

3. Create a `config.json` file in the root directory:
```json
{
    "token": "YOUR_DISCORD_BOT_TOKEN",
    "clientId": "YOUR_BOT_CLIENT_ID",
    "invidiousInstance": "https://invidious.example.com",
    "soundcloudClientId": "YOUR_SOUNDCLOUD_CLIENT_ID"
}
```

4. Start the bot:
```bash
bun run index.js
```

## Docker Support

You can run the bot using Docker in two ways:

### Option 1: Using the Official Image

1. Create a `config.json` file with your bot configuration
2. Create a `docker-compose.yml`:
```yaml
services:
  musk-chan:
    image: 0xgingi/musk-chan:latest
    container_name: musk-chan
    restart: unless-stopped
    volumes:
      - ./config.json:/app/config.json
```

3. Run the container:
```bash
docker-compose up -d
```

### Option 2: Building from Source

1. Clone the repository:
```bash
git clone https://github.com/toolworks-dev/musk-chan.git
cd musk-chan
```

2. Create your `config.json` file

3. Build and run using docker-compose:
```bash
docker-compose up -d --build
```

The bot will automatically restart unless stopped manually. You can view the logs using:
```bash
docker-compose logs -f
```