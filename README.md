# Musk-Chan Discord Bot

A feature-rich Discord bot built with discord.js that allows you to play music from a Youtube Invidious instance in your Discord server.

## Features

- 🎵 Play music from YouTube URLs or search queries (Uses Invidious Instance)
- 📑 Queue system with playlist support
- 🎮 Interactive song selection from search results
- 🔄 Queue management commands (clear, shuffle, skip)
- ⏯️ Playback controls (pause, stop)

## Commands

- `/play <query>` - Play a song from YouTube URL or search query
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
    "invidiousInstance": "https://invidious.example.com"
}
```

4. Start the bot:
```bash
bun run index.js
```

## Docker Support

You can also run the bot using Docker:

```bash
docker-compose up -d
```