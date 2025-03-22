import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { musicManager } from '../index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube/Soundcloud video, playlist, or audio file')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('YouTube/Soundcloud URL or search query')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('Audio file to play (MP3, FLAC, WAV, etc.)')
                .setRequired(false)),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        const file = interaction.options.getAttachment('file');
        const voiceChannel = interaction.member.voice.channel;

        if (!query && !file) {
            return interaction.reply({
                content: 'You need to provide either a search query or an audio file!',
                flags: 1 << 6
            });
        }

        if (!voiceChannel) {
            return interaction.reply({
                content: 'You need to be in a voice channel!',
                flags: 1 << 6
            });
        }

        await interaction.deferReply();

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        if (musicManager.checkVoiceChannel(connection)) {
            musicManager.startDisconnectTimer(interaction.guildId, connection);
        }

        const queue = musicManager.getGuildQueue(interaction.guildId);
        const player = musicManager.getPlayer(interaction.guildId);
        
        connection.subscribe(player);

        try {
            if (file) {
                const supportedFormats = ['.mp3', '.flac', '.wav', '.ogg', '.m4a'];
                const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
                
                if (!supportedFormats.includes(fileExtension)) {
                    return interaction.editReply(`Unsupported file format! Supported formats: ${supportedFormats.join(', ')}`);
                }

                const fileDetails = musicManager.getFileDetails(file);
                queue.push(fileDetails);

                const embed = new EmbedBuilder()
                    .setTitle('Added to Queue')
                    .setDescription(`[${fileDetails.title}](${fileDetails.url})`)
                    .setColor('#00FF00');

                if (queue.length === 1) {
                    musicManager.setupEventHandlers(interaction.guildId, interaction.channel);
                    await player.play(await musicManager.createAudioResourceFromAttachment(file));
                }

                return interaction.editReply({ embeds: [embed] });
            }

            if (query.includes('playlist?list=')) {
                const playlistDetails = await musicManager.getPlaylistDetails(query);
                if (!playlistDetails || !playlistDetails.videos.length) {
                    return interaction.editReply('Failed to get playlist details!');
                }

                queue.push(...playlistDetails.videos);

                const embed = new EmbedBuilder()
                    .setTitle('Added Playlist to Queue')
                    .setDescription(`Added ${playlistDetails.videos.length} songs from playlist: ${playlistDetails.title}`)
                    .setColor('#00FF00');

                if (queue.length === playlistDetails.videos.length) {
                    musicManager.setupEventHandlers(interaction.guildId, interaction.channel);
                    await player.play(await musicManager.createAudioResource(queue[0].url));
                }

                return interaction.editReply({ embeds: [embed] });
            }

            if (query && musicManager.isDirectAudioUrl(query)) {
                const fileDetails = musicManager.getDirectAudioDetails(query);
                queue.push(fileDetails);

                const embed = new EmbedBuilder()
                    .setTitle('Added to Queue')
                    .setDescription(`[${fileDetails.title}](${fileDetails.url})`)
                    .setColor('#00FF00');

                if (queue.length === 1) {
                    musicManager.setupEventHandlers(interaction.guildId, interaction.channel);
                    await player.play(await musicManager.createAudioResourceFromUrl(query));
                }

                return interaction.editReply({ embeds: [embed] });
            }

            const isUrl = query.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|invidious\.[^\/]+|soundcloud\.com)\/.+$/);

            try {
                if (isUrl) {
                    const playlistId = musicManager.extractPlaylistId(query);
                    if (playlistId) {
                        const playlist = await musicManager.getPlaylistDetails(query);
                        if (!playlist) {
                            return interaction.editReply('Failed to get playlist details!');
                        }

                        playlist.videos.forEach(video => queue.push(video));

                        const embed = new EmbedBuilder()
                            .setTitle('Added Playlist to Queue')
                            .setDescription(`Added ${playlist.videos.length} songs from playlist: ${playlist.title}`)
                            .setColor('#00FF00');

                        if (queue.length === playlist.videos.length) {
                            musicManager.setupEventHandlers(interaction.guildId, interaction.channel);
                            await player.play(await musicManager.createAudioResource(queue[0].url));
                        }

                        return interaction.editReply({ embeds: [embed] });
                    }

                    const videoDetails = await musicManager.getVideoDetails(query);
                    if (!videoDetails) {
                        return interaction.editReply('Failed to get video details!');
                    }

                    queue.push(videoDetails);
                    const embed = new EmbedBuilder()
                        .setTitle('Added to Queue')
                        .setDescription(`[${videoDetails.title}](${videoDetails.url})`)
                        .setColor('#00FF00');

                    if (queue.length === 1) {
                        musicManager.setupEventHandlers(interaction.guildId, interaction.channel);
                        await player.play(await musicManager.createAudioResource(videoDetails.url));
                    }

                    return interaction.editReply({ embeds: [embed] });
                } else {
                    const searchResults = await musicManager.searchYouTube(query);
                    if (!searchResults || searchResults.length === 0) {
                        return interaction.editReply('No results found!');
                    }

                    const firstResult = searchResults[0];
                    queue.push(firstResult);

                    const embed = new EmbedBuilder()
                        .setTitle('Added to Queue')
                        .setDescription(`[${firstResult.title}](${firstResult.url})`)
                        .setColor('#00FF00');

                    if (queue.length === 1) {
                        musicManager.setupEventHandlers(interaction.guildId, interaction.channel);
                        await player.play(await musicManager.createAudioResource(firstResult.url));
                    }

                    return interaction.editReply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error playing song:', error);
                if (error.message.includes('Status code: 403')) {
                    return interaction.editReply('Cannot play this video due to YouTube restrictions.');
                }
                return interaction.editReply('Failed to play the video. Please try another one.');
            }
        } catch (error) {
            console.error('Error in play command:', error);
            return interaction.editReply('An error occurred while processing your request.');
        }
    },
}; 