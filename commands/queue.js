const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),

    async execute(interaction) {
        const queue = musicManager.getGuildQueue(interaction.guildId);
        
        if (queue.length === 0) {
            return interaction.reply('The queue is empty!');
        }

        const embed = new EmbedBuilder()
            .setTitle('Current Queue')
            .setColor('#FF0000');

        const songs = queue.map((url, index) => {
            if (index === 0) {
                return `🎵 **Now Playing**: ${url}`;
            }
            return `${index}. ${url}`;
        });

        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < songs.length; i += chunkSize) {
            chunks.push(songs.slice(i, i + chunkSize));
        }

        embed.setDescription(chunks[0].join('\n'));
        embed.setFooter({ text: `Page 1/${chunks.length} | ${queue.length} total songs` });

        await interaction.reply({ embeds: [embed] });
    },
}; 