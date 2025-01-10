const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),

    async execute(interaction) {
        const player = musicManager.getPlayer(interaction.guildId);
        
        if (player.pause()) {
            await interaction.reply('Paused the music!');
        } else {
            await interaction.reply('Failed to pause or no music is playing!');
        }
    },
}; 