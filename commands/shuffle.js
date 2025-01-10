const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the current queue'),

    async execute(interaction) {
        const queue = musicManager.getGuildQueue(interaction.guildId);
        
        if (queue.length <= 1) {
            return interaction.reply('Need at least 2 songs in the queue to shuffle!');
        }

        const currentSong = queue.shift();
        musicManager.shuffle(interaction.guildId);
        queue.unshift(currentSong);

        await interaction.reply('Queue has been shuffled!');
    },
}; 