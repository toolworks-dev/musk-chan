const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcookies')
        .setDescription('Set YouTube cookies for authentication')
        .addStringOption(option =>
            option.setName('cookies')
                .setDescription('YouTube cookies string. Get cookies from: https://github.com/distubejs/ytdl-core#how-to-get-cookies')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const cookies = interaction.options.getString('cookies');
        
        if (musicManager.saveCookies(cookies)) {
            await interaction.editReply('YouTube cookies have been successfully saved!');
        } else {
            await interaction.editReply('Failed to save YouTube cookies!');
        }
    },
}; 