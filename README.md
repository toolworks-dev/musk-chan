# Musk-Chan Discord Bot

A feature-rich Discord bot built with discord.js that allows you to play music from an Invidious instance!

![musk](https://github.com/user-attachments/assets/5c3f68c0-84eb-496f-ac1c-f47affc71dc6)

## Features

- 🎵 Play music from Invidious, Soundcloud, File Attachments, and Direct Links

## Commands

- `/play <query>` - Play a song from Youtube or Soundcloud
- `/queue` - Display the current music queue
- `/clear` - Clear the music queue (keeps current song)
- `/shuffle` - Shuffle the current queue
- `/next` - Skip to the next song
- `/pause` - Pause the current song
- `/stop` - Stop playback and clear queue
- `/nowplaying` - Shows current song

## Prerequisites

- Docker / Docker Compose
- Discord Bot Token
- Public or Private Invidious Instance 
  - Find one at https://api.invidious.io/ or host your own (reccomended)
- Soundcloud Client ID
  - Get yours following this guide: https://www.npmjs.com/package/soundcloud-downloader#client-id

## Setup

1. Clone the repository
2. Copy `config.json.example` to `config.json` and fill in your Discord bot token and other settings
3. Start the services:
```bash
docker compose up -d