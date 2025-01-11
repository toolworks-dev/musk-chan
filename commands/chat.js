import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import ollamaManager from '../utils/ollamaManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Chat with Musk-Chan')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Your message to Musk-Chan')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const message = interaction.options.getString('message');
            const response = await ollamaManager.chat(interaction.user.id, message);

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: 'Musk-Chan',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setDescription(response)
                .setColor('#0099ff')
                .setFooter({ 
                    text: `Model: ${ollamaManager.model} | Powered by Ollama`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in chat command:', error);
            await interaction.editReply('Sorry, I encountered an error while processing your request.');
        }
    },
}; 