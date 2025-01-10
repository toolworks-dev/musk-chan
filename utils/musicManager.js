const { Collection } = require('discord.js');
const { createAudioPlayer, AudioPlayerStatus, createAudioResource } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const { EventEmitter } = require('events');

class MusicManager extends EventEmitter {
    constructor() {
        super();
        this.queues = new Collection();
        this.players = new Collection();
        this.agent = this.createYTDLAgent();
        this.playerListeners = new Set();
        this.youtube = google.youtube({
            version: 'v3',
            auth: require('../config.json').youtubeApiKey
        });
    }

    createYTDLAgent() {
        try {
            const cookiesPath = path.join(__dirname, '../cookies.txt');
            if (fs.existsSync(cookiesPath)) {
                const cookiesData = fs.readFileSync(cookiesPath, 'utf8');
                return ytdl.createAgent(JSON.parse(cookiesData));
            }
        } catch (error) {
            console.error('Error creating YTDL agent:', error);
        }
        return null;
    }

    saveCookies(cookies) {
        try {
            const cookiesPath = path.join(__dirname, '../cookies.txt');
            fs.writeFileSync(cookiesPath, cookies);
            this.agent = ytdl.createAgent(JSON.parse(cookies));
            return true;
        } catch (error) {
            console.error('Error saving cookies:', error);
            return false;
        }
    }

    getGuildQueue(guildId) {
        if (!this.queues.has(guildId)) {
            this.queues.set(guildId, []);
        }
        return this.queues.get(guildId);
    }

    getPlayer(guildId) {
        if (!this.players.has(guildId)) {
            const player = createAudioPlayer();
            this.players.set(guildId, player);
            this.setupPlayerListeners(guildId, player);
        }
        return this.players.get(guildId);
    }

    setupPlayerListeners(guildId, player) {
        if (this.playerListeners.has(guildId)) return;
        
        player.on(AudioPlayerStatus.Playing, () => {
            console.log('Player status: Playing');
        });

        player.on(AudioPlayerStatus.Idle, async () => {
            console.log('Player status: Idle');
            const queue = this.getGuildQueue(guildId);
            queue.shift();
            
            if (queue.length === 0) {
                console.log('Queue empty, stopping playback');
                player.stop();
                return;
            }

            if (queue.length > 0) {
                console.log('Playing next song:', queue[0].title);
                const stream = ytdl(queue[0].url, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25,
                    agent: this.agent
                });
                const resource = createAudioResource(stream, {
                    inlineVolume: true
                });
                resource.volume?.setVolume(1);
                player.play(resource);
                
                const embed = new EmbedBuilder()
                    .setTitle('Now Playing')
                    .setDescription(queue[0].title)
                    .setColor('#0099ff');
                
                this.emit('songStart', guildId, embed);
            }
        });

        player.on('error', error => {
            console.error('Player error:', error);
            this.emit('playerError', guildId, error);
        });

        this.playerListeners.add(guildId);
    }

    shuffle(guildId) {
        const queue = this.getGuildQueue(guildId);
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }
    }

    async getVideoDetails(url) {
        try {
            const videoInfo = await ytdl.getInfo(url, {
                agent: this.agent
            });
            return {
                id: videoInfo.videoDetails.videoId,
                title: videoInfo.videoDetails.title,
                url: videoInfo.videoDetails.video_url,
                duration: parseInt(videoInfo.videoDetails.lengthSeconds)
            };
        } catch (error) {
            console.error('Error fetching video details:', error);
            return null;
        }
    }

    extractVideoId(url) {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    }

    extractPlaylistId(url) {
        const match = url.match(/[&?]list=([^&]+)/i);
        return match ? match[1] : null;
    }

    getYTDLOptions() {
        return { filter: 'audioonly' };
    }

    async getPlaylistDetails(url) {
        try {
            const playlistId = new URL(url).searchParams.get('list');
            if (!playlistId) return null;

            const videos = [];
            let nextPageToken = '';

            do {
                const response = await this.youtube.playlistItems.list({
                    part: 'snippet',
                    playlistId: playlistId,
                    maxResults: 50,
                    pageToken: nextPageToken
                });

                for (const item of response.data.items) {
                    const videoId = item.snippet.resourceId.videoId;
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    const videoDetails = await this.getVideoDetails(videoUrl);
                    if (videoDetails) {
                        videos.push(videoDetails);
                    }
                }

                nextPageToken = response.data.nextPageToken;
            } while (nextPageToken);

            return {
                title: response.data.items[0].snippet.playlistTitle,
                videos: videos
            };
        } catch (error) {
            console.error('Error fetching playlist:', error);
            return null;
        }
    }

    async searchYouTube(query) {
        try {
            const response = await this.youtube.search.list({
                part: 'snippet',
                q: query,
                type: 'video',
                maxResults: 10
            });

            const videos = [];
            for (const item of response.data.items) {
                const videoId = item.id.videoId;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                const videoDetails = await this.getVideoDetails(videoUrl);
                if (videoDetails) {
                    videos.push(videoDetails);
                }
            }

            return videos;
        } catch (error) {
            console.error('Error searching YouTube:', error);
            return null;
        }
    }

    setupEventHandlers(guildId, messageChannel) {
        const onSongStart = (gId, embed) => {
            if (gId === guildId) {
                messageChannel.send({ embeds: [embed] });
            }
        };
        const onPlayerError = (gId, error) => {
            if (gId === guildId) {
                messageChannel.send('An error occurred while playing the song!');
            }
        };

        this.on('songStart', onSongStart);
        this.on('playerError', onPlayerError);
    }
}

module.exports = new MusicManager(); 