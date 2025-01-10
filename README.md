# Musk-Chan Discord Bot

A feature-rich Discord bot built with discord.js that allows you to play music from YouTube in your Discord server.

## Features

- 🎵 Play music from YouTube URLs or search queries
- 📑 Queue system with playlist support
- 🎮 Interactive song selection from search results
- 🔄 Queue management commands (clear, shuffle, skip)
- ⏯️ Playback controls (pause, stop)
- 🍪 YouTube cookie support for age-restricted content

## Commands

- `/play <query>` - Play a song from YouTube URL or search query
- `/queue` - Display the current music queue
- `/clear` - Clear the music queue (keeps current song)
- `/shuffle` - Shuffle the current queue
- `/next` - Skip to the next song
- `/pause` - Pause the current song
- `/stop` - Stop playback and clear queue
- `/setcookies` - Set YouTube cookies for authentication

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Bun](https://bun.sh/) package manager
- Discord Bot Token
- YouTube API Key (Public)
- Youtube Account Cookies

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

2.2. Get your youtube api key and cookies:

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new Youtube Data API Public Key
3. (Get Your Youtube Account Cookies - Optional)[https://github.com/distubejs/ytdl-core?tab=readme-ov-file#how-to-get-cookies]

3. Create a `config.json` file in the root directory:
```json
{
    "token": "YOUR_DISCORD_BOT_TOKEN",
    "clientId": "YOUR_BOT_CLIENT_ID",
    "youtubeApiKey": "YOUR_YOUTUBE_API_KEY"
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