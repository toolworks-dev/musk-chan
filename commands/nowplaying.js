import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicManager } from '../index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows the currently playing song'),

    async execute(interaction) {
        const queue = musicManager.getGuildQueue(interaction.guildId);
        
        if (!queue || queue.length === 0) {
            return interaction.reply('Nothing is currently playing.');
        }

        const currentSong = queue[0];
        const embed = new EmbedBuilder()
            .setTitle('Now Playing')
            .setDescription(`[${currentSong.title}](${currentSong.url})`)
            .addFields(
                { name: 'Duration', value: `${Math.floor(currentSong.duration / 60)}:${(currentSong.duration % 60).toString().padStart(2, '0')}`, inline: true },
                { name: 'Uploader', value: currentSong.author, inline: true }
            )
            .setThumbnail(currentSong.thumbnail)
            .setColor('#0099ff');

        await interaction.reply({ embeds: [embed] });
    },
}; 