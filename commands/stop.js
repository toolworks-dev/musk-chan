const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const musicManager = require('../utils/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing music and clear the queue'),

    async execute(interaction) {
        const queue = musicManager.getGuildQueue(interaction.guildId);
        const player = musicManager.getPlayer(interaction.guildId);
        const connection = getVoiceConnection(interaction.guildId);

        queue.length = 0;
        player.stop();

        if (connection) {
            connection.destroy();
        }

        await interaction.reply('Stopped playing music and cleared the queue!');
    },
}; 