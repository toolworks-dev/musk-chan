import { SlashCommandBuilder } from 'discord.js';
import musicManager from '../utils/musicManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the music queue'),

    async execute(interaction) {
        const queue = musicManager.getGuildQueue(interaction.guildId);
        const currentSong = queue[0];
        
        queue.length = 0;
        
        if (currentSong) {
            queue.push(currentSong);
            await interaction.reply('Queue cleared! (Current song kept playing)');
        } else {
            await interaction.reply('Queue cleared!');
        }
    },
};