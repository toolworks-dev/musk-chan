const { SlashCommandBuilder } = require('discord.js');
const ytdl = require('@distube/ytdl-core');
const { createAudioResource } = require('@discordjs/voice');
const musicManager = require('../utils/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('next')
        .setDescription('Skip to the next song'),

    async execute(interaction) {
        const queue = musicManager.getGuildQueue(interaction.guildId);
        const player = musicManager.getPlayer(interaction.guildId);

        if (queue.length <= 1) {
            return interaction.reply('No more songs in the queue!');
        }

        queue.shift();
        const nextSong = queue[0];
        const stream = ytdl(nextSong.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });
        const resource = createAudioResource(stream, {
            inlineVolume: true
        });
        
        player.play(resource);
        await interaction.reply(`Skipping to next song: ${nextSong.title}`);
    },
}; 