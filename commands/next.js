import { SlashCommandBuilder } from 'discord.js';
import { createAudioResource } from '@discordjs/voice';
import { musicManager } from '../index.js';

export default {
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
        
        try {
            const resource = await musicManager.createAudioResource(nextSong.url);
            player.play(resource);
            await interaction.reply(`Skipping to next song: ${nextSong.title}`);
        } catch (error) {
            console.error('Error playing next song:', error);
            await interaction.reply('Failed to play the next song. Please try skipping again.');
        }
    },
}; 