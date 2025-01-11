import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import musicManager from '../utils/musicManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube video or playlist')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('YouTube URL or search query')
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

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            const player = musicManager.getPlayer(interaction.guildId);
            connection.subscribe(player);

            const queue = musicManager.getGuildQueue(interaction.guildId);
            const isUrl = query.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|invidious\.[^\/]+)\/.+$/);

            try {
                if (isUrl) {
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
                    return interaction.editReply('Cannot play this video due to YouTube restrictions. Try setting cookies with /setcookies command.');
                }
                return interaction.editReply('Failed to play the video. Please try another one.');
            }
        } catch (error) {
            console.error('Error in play command:', error);
            return interaction.editReply('An error occurred while processing your request.');
        }
    },
}; 