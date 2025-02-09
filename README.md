# Musk-Chan Discord Bot

A feature-rich Discord bot built with discord.js that allows you to play music and chat with AI.

![musk](https://github.com/user-attachments/assets/5c3f68c0-84eb-496f-ac1c-f47affc71dc6)

## Features

- 🎵 Play music from YouTube (Uses Invidious Instance), Soundcloud, File Attachments, and Direct Links
- 🤖 AI Chat powered by Ollama with Short Term and Long Term Memory

## Commands

- `/play <query>` - Play a song from Youtube or Soundcloud
- `/queue` - Display the current music queue
- `/clear` - Clear the music queue (keeps current song)
- `/shuffle` - Shuffle the current queue
- `/next` - Skip to the next song
- `/pause` - Pause the current song
- `/stop` - Stop playback and clear queue
- `/nowplaying` - Shows current song
- `/chat <message>` - Chat with Musk-Chan AI
- `/chatsettings clear` - Clear your chat history
- `/chatsettings model <name>` - Change the AI model
- `/chatsettings listmodels` - List available models
- `/chatsettings delete <name>` - Delete an AI model

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
```
4. Create the custom AI model:
```bash
docker compose exec ollama ollama pull llama3.2:3b-instruct-q5_K_M
docker compose exec ollama ollama create muskchan2 --file Modelfile2
```

## AI Chat
The bot uses Ollama for AI chat functionality. By default, it uses the muskchan2 model (based on llama3.2). You can:
- Change models using `/chatsettings model <name>`
- View available models with `/chatsettings listmodels`
- Clear chat history with `/chatsettings clear`
- Delete models with `/chatsettings delete <name>`

To add more models:
1. Run `docker compose exec ollama ollama pull <model>`
