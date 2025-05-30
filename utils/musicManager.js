import { Collection, EmbedBuilder } from 'discord.js';
import { createAudioPlayer, AudioPlayerStatus, createAudioResource, StreamType } from '@discordjs/voice';
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Client as SoundCloudClient } from 'soundcloud-scraper';
import { createReadStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf8'));

class MusicManager extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.queues = new Collection();
        this.players = new Collection();
        this.playerListeners = new Set();
        this.invidiousInstance = config.invidiousInstance;
        this.soundcloud = new SoundCloudClient(config.soundcloudClientId);
        this.disconnectTimers = new Collection();
    }

    async getVideoDetails(url) {
        try {
            if (url.includes('soundcloud.com')) {
                try {
                    if (url.includes('on.soundcloud.com')) {
                        try {
                            const response = await fetch(url, { 
                                redirect: 'follow',
                                method: 'HEAD'
                            });
                            if (response.url) {
                                url = response.url;
                            }
                        } catch (error) {
                            console.error('Error following SoundCloud redirect:', error);
                        }
                    }
                    
                    const song = await this.soundcloud.getSongInfo(url);
                    return {
                        title: song.title,
                        url: url,
                        duration: Math.floor(song.duration / 1000),
                        thumbnail: song.thumbnail,
                        author: song.author.name,
                        source: 'soundcloud'
                    };
                } catch (error) {
                    console.error('SoundCloud error:', error.message);
                    return null;
                }
            }

            const videoId = this.extractVideoId(url);
            if (!videoId) return null;

            try {
                const response = await fetch(`${this.invidiousInstance}/api/v1/videos/${videoId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const text = await response.text();
                let data;
                
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error('Failed to parse JSON response:', text.substring(0, 100) + '...');
                    throw new Error('Invalid JSON response from Invidious');
                }

                return {
                    title: data.title,
                    url: `${this.invidiousInstance}/watch?v=${videoId}`,
                    duration: data.lengthSeconds,
                    thumbnail: data.videoThumbnails?.[0]?.url || '',
                    author: data.author,
                    source: 'youtube'
                };
            } catch (error) {
                console.error('Error with Invidious API:', error);
                return null;
            }
        } catch (error) {
            console.error('Error fetching video details:', error);
            return null;
        }
    }

    async createAudioResource(url) {
        try {
            if (url.includes('soundcloud.com')) {
                if (url.includes('on.soundcloud.com')) {
                    try {
                        const response = await fetch(url, { 
                            redirect: 'follow',
                            method: 'HEAD'
                        });
                        if (response.url) {
                            url = response.url;
                        }
                    } catch (error) {
                        console.error('Error following SoundCloud redirect:', error);
                    }
                }
                
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
            if (query.includes('playlist?list=')) {
                const playlistDetails = await this.getPlaylistDetails(query);
                if (playlistDetails && playlistDetails.videos.length > 0) {
                    return playlistDetails.videos;
                }
                return null;
            }

            if (query.includes('soundcloud.com') || query.includes('on.soundcloud.com') || 
                query.includes('youtube.com') || query.includes('youtu.be')) {
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
        if (url.includes('music.youtube.com')) {
            const videoId = url.match(/[?&]v=([^&]+)/i)?.[1];
            if (videoId) {
                return videoId;
            }
        }

        const patterns = [
            /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
            /(?:invidious\.[^\/]+\/watch\?v=)([^"&?\/\s]{11})/i,
            /(?:soundcloud\.com\/[\w-]+\/[\w-]+(?:\/[\w-]+)?)/i,
            /(?:on\.soundcloud\.com\/[\w-]+)/i
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
        if (url.includes('music.youtube.com') || url.includes('youtube.com')) {
            const match = url.match(/[&?]list=([^&]+)/i);
            return match ? match[1] : null;
        }
        return null;
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

            if (!data.videos) {
                throw new Error('No videos found in playlist');
            }

            const videos = data.videos.map(video => ({
                title: video.title,
                url: `${this.invidiousInstance}/watch?v=${video.videoId}`,
                duration: video.lengthSeconds,
                thumbnail: video.videoThumbnails?.[0]?.url || '',
                author: video.author,
                source: 'youtube'
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

    async createAudioResourceFromAttachment(attachment) {
        try {
            return createAudioResource(attachment.proxyURL, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true
            });
        } catch (error) {
            console.error('Error creating audio resource from attachment:', error);
            throw error;
        }
    }

    getFileDetails(attachment) {
        return {
            title: attachment.name,
            url: attachment.proxyURL,
            duration: 0, 
            thumbnail: 'https://cdn.discordapp.com/avatars/1327314109657518212/8b4a88e8b3aa4805967f07feb5cad6b6.webp',
            author: 'Local File',
            source: 'local'
        };
    }

    isDirectAudioUrl(url) {
        try {
            const supportedFormats = ['.mp3', '.flac', '.wav', '.ogg', '.m4a'];
            const urlObj = new URL(url);
            const path = urlObj.pathname.toLowerCase();
            return supportedFormats.some(format => path.endsWith(format));
        } catch {
            return false;
        }
    }

    getDirectAudioDetails(url) {
        const fileName = url.split('/').pop();
        return {
            title: fileName,
            url: url,
            duration: 0,
            thumbnail: 'https://cdn.discordapp.com/avatars/1327314109657518212/8b4a88e8b3aa4805967f07feb5cad6b6.webp',
            author: 'Direct Link',
            source: 'direct'
        };
    }

    async createAudioResourceFromUrl(url) {
        try {
            return createAudioResource(url, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true
            });
        } catch (error) {
            console.error('Error creating audio resource from URL:', error);
            throw error;
        }
    }

    startDisconnectTimer(guildId, connection) {
        this.clearDisconnectTimer(guildId);
        
        const timeout = 30000; // 30 seconds
        this.disconnectTimers.set(guildId, setTimeout(() => {
            const queue = this.getGuildQueue(guildId);
            const player = this.getPlayer(guildId);
            
            queue.length = 0;
            player.stop();
            connection.destroy();
            
            this.disconnectTimers.delete(guildId);
        }, timeout));
    }

    clearDisconnectTimer(guildId) {
        const timer = this.disconnectTimers.get(guildId);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(guildId);
        }
    }

    checkVoiceChannel(connection) {
        try {
            const channel = connection.joinConfig.channelId;
            const guild = connection.joinConfig.guildId;
            const voiceChannel = this.client.guilds.cache.get(guild)?.channels.cache.get(channel);
            
            if (!voiceChannel?.members) return false;
            
            const humanCount = voiceChannel.members.filter(member => !member.user.bot).size;
            return humanCount === 0;
        } catch (error) {
            console.error('Error checking voice channel:', error);
            return false;
        }
    }

    handleVoiceStateUpdate(oldState, newState, connection) {
        if (!connection) return;
        
        const guildId = connection.joinConfig.guildId;
        
        if (newState.channelId === connection.joinConfig.channelId) {
            this.clearDisconnectTimer(guildId);
            return;
        }
        
        if (this.checkVoiceChannel(connection)) {
            this.startDisconnectTimer(guildId, connection);
        }
    }
}

export default MusicManager; 