const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const ytdl = require('@distube/ytdl-core');
const { createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const musicManager = require('../utils/musicManager');

module.exports = {
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
            return interaction.reply('You need to be in a voice channel!');
        }

        await interaction.deferReply();

        try {
            const queue = musicManager.getGuildQueue(interaction.guildId);
            
            const isUrl = query.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/);
            
            if (isUrl) {
                const isPlaylist = query.includes('playlist?list=');
                
                if (isPlaylist) {
                    const playlistDetails = await musicManager.getPlaylistDetails(query);
                    if (!playlistDetails || !playlistDetails.videos) {
                        return interaction.editReply('Could not load playlist!');
                    }

                    queue.push(...playlistDetails.videos);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('Added Playlist to Queue')
                        .setDescription(`Added ${playlistDetails.videos.length} songs from playlist: ${playlistDetails.title}`)
                        .setColor('#00FF00');

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    const videoDetails = await musicManager.getVideoDetails(query);
                    if (!videoDetails) {
                        return interaction.editReply('Could not load video details!');
                    }
                    queue.push(videoDetails);
                    await handlePlayback(interaction, voiceChannel, queue, false);
                }
            } else {
                const searchResults = await musicManager.searchYouTube(query);
                
                if (!searchResults || searchResults.length === 0) {
                    return interaction.editReply('No results found!');
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('song-select')
                    .setPlaceholder('Select a song')
                    .addOptions(
                        searchResults.map((result, index) => ({
                            label: result.title.substring(0, 100),
                            description: `Duration: ${formatDuration(result.duration)}`,
                            value: index.toString()
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const response = await interaction.editReply({
                    content: 'Select a song to play:',
                    components: [row]
                });

                try {
                    const collector = response.createMessageComponentCollector({ 
                        time: 30000,
                        max: 1
                    });

                    collector.on('collect', async i => {
                        if (i.user.id !== interaction.user.id) {
                            return i.reply({ content: 'This selection is not for you!', ephemeral: true });
                        }

                        const selectedIndex = parseInt(i.values[0]);
                        const selectedVideo = searchResults[selectedIndex];
                        
                        queue.push(selectedVideo);
                        await handlePlayback(interaction, voiceChannel, queue, true, i);
                    });

                    collector.on('end', collected => {
                        if (collected.size === 0) {
                            interaction.editReply({
                                content: 'Song selection timed out!',
                                components: []
                            });
                        }
                    });

                } catch (error) {
                    console.error('Error in selection handling:', error);
                    await interaction.editReply('An error occurred while processing your selection.');
                }
            }

        } catch (error) {
            console.error('Main error:', error);
            interaction.editReply('Failed to play the video/playlist!');
        }
    }
};

async function handlePlayback(interaction, voiceChannel, queue, isFromSearch, selectInteraction = null) {
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
    });

    const player = musicManager.getPlayer(interaction.guildId);
    connection.subscribe(player);

    const messageChannel = interaction.channel;
    musicManager.setupEventHandlers(interaction.guildId, messageChannel);

    if (queue.length === 1) {
        try {
            const stream = ytdl(queue[0].url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                agent: musicManager.agent
            });
            
            const resource = createAudioResource(stream, {
                inlineVolume: true
            });
            resource.volume?.setVolume(1);
            player.play(resource);
        } catch (error) {
            console.error('Error during stream creation:', error);
            return interaction.channel.send('Error playing the audio. Please try again.');
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('Added to Queue')
        .setDescription(`Added: ${queue[queue.length - 1].title}`)
        .setColor('#00FF00');

    if (isFromSearch && selectInteraction) {
        await selectInteraction.update({ 
            content: 'Song added to queue!',
            embeds: [embed],
            components: [] 
        });
    } else {
        await interaction.editReply({ embeds: [embed] });
    }
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 