import { Collection, EmbedBuilder } from 'discord.js';
import { createAudioPlayer, AudioPlayerStatus, createAudioResource, StreamType } from '@discordjs/voice';
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Client as SoundCloudClient } from 'soundcloud-scraper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf8'));

class MusicManager extends EventEmitter {
    constructor() {
        super();
        this.queues = new Collection();
        this.players = new Collection();
        this.playerListeners = new Set();
        this.invidiousInstance = config.invidiousInstance || 'https://invidious.0xgingi.com';
        this.soundcloud = new SoundCloudClient(config.soundcloudClientId);
    }

    async getVideoDetails(url) {
        try {
            if (url.includes('soundcloud.com')) {
                const song = await this.soundcloud.getSongInfo(url);
                return {
                    title: song.title,
                    url: url,
                    duration: Math.floor(song.duration / 1000),
                    thumbnail: song.thumbnail,
                    author: song.author.name,
                    source: 'soundcloud'
                };
            }

            const videoId = this.extractVideoId(url);
            if (!videoId) return null;

            const response = await fetch(`${this.invidiousInstance}/api/v1/videos/${videoId}`);
            const data = await response.json();

            return {
                title: data.title,
                url: `${this.invidiousInstance}/watch?v=${videoId}`,
                duration: data.lengthSeconds,
                thumbnail: data.videoThumbnails[0].url,
                author: data.author,
                source: 'youtube'
            };
        } catch (error) {
            console.error('Error fetching video details:', error);
            return null;
        }
    }

    async createAudioResource(url) {
        try {
            if (url.includes('soundcloud.com')) {
                const song = await this.soundcloud.getSongInfo(url);
                const stream = await song.downloadProgressive();
                return createAudioResource(stream, {
                    inputType: StreamType.Arbitrary,
                    inlineVolume: true
                });
            }

            const videoId = this.extractVideoId(url);
            if (!videoId) throw new Error('Invalid video URL');

            const response = await fetch(`${this.invidiousInstance}/api/v1/videos/${videoId}`);
            const data = await response.json();
            
            const audioFormat = data.adaptiveFormats
                .filter(f => f.type.startsWith('audio'))
                .sort((a, b) => b.bitrate - a.bitrate)[0];

            if (!audioFormat) {
                throw new Error('No suitable audio format found');
            }

            const stream = await fetch(audioFormat.url).then(res => res.body);
            return createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true
            });
        } catch (error) {
            console.error('Error creating audio resource:', error);
            throw error;
        }
    }

    async searchYouTube(query) {
        try {
            if (query.includes('soundcloud.com')) {
                const details = await this.getVideoDetails(query);
                return details ? [details] : null;
            }

            const response = await fetch(`${this.invidiousInstance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
            const results = await response.json();

            return results.map(video => ({
                title: video.title,
                url: `${this.invidiousInstance}/watch?v=${video.videoId}`,
                duration: video.lengthSeconds,
                thumbnail: video.videoThumbnails[0].url,
                author: video.author,
                source: 'youtube'
            }));
        } catch (error) {
            console.error('Error searching:', error);
            return null;
        }
    }

    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
            /(?:invidious\.[^\/]+\/watch\?v=)([^"&?\/\s]{11})/i,
            /(?:soundcloud\.com\/.+\/[^\/]+)/i
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                if (pattern.toString().includes('soundcloud')) {
                    return match[0];
                }
                return match[1];
            }
        }
        return null;
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
                try {
                    const resource = await this.createAudioResource(queue[0].url);
                    player.play(resource);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('Now Playing')
                        .setDescription(queue[0].title)
                        .setColor('#0099ff');
                    
                    this.emit('songStart', guildId, embed);
                } catch (error) {
                    console.error('Error playing song:', error);
                    this.emit('playerError', guildId, error);
                }
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

    extractPlaylistId(url) {
        const match = url.match(/[&?]list=([^&]+)/i);
        return match ? match[1] : null;
    }

    getYTDLOptions() {
        return { filter: 'audioonly' };
    }

    async getPlaylistDetails(url) {
        try {
            const playlistId = this.extractPlaylistId(url);
            if (!playlistId) return null;

            const response = await fetch(`${this.invidiousInstance}/api/v1/playlists/${playlistId}`);
            const data = await response.json();

            const videos = data.videos.map(video => ({
                title: video.title,
                url: `${this.invidiousInstance}/watch?v=${video.videoId}`,
                duration: video.lengthSeconds,
                thumbnail: video.videoThumbnails?.[0]?.url || '',
                author: video.author
            }));

            return {
                title: data.title,
                videos: videos
            };
        } catch (error) {
            console.error('Error fetching playlist:', error);
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

export default new MusicManager(); 