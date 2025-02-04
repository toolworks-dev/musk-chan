import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import musicManager from '../utils/musicManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube/Soundcloud video or playlist')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('YouTube/Soundcloud URL or search query')
                .setRequired(true)),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ 
                content: 'You need to be in a voice channel!',
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        const queue = musicManager.getGuildQueue(interaction.guildId);
        const player = musicManager.getPlayer(interaction.guildId);
        
        connection.subscribe(player);

        try {
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