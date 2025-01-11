import { SlashCommandBuilder } from 'discord.js';
import ollamaManager from '../utils/ollamaManager.js';
import memoryManager from '../utils/memoryManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('chatsettings')
        .setDescription('Manage chat settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear your chat history')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type of memory to clear')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Short-term', value: 'short' },
                            { name: 'Long-term', value: 'long' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('model')
                .setDescription('Change the AI model')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Model name')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('listmodels')
                .setDescription('List available AI models'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an AI model')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Model name to delete')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'clear':
                const type = interaction.options.getString('type') || 'all';
                if (type === 'all') {
                    await memoryManager.clearMemory(interaction.user.id, 'short');
                    await memoryManager.clearMemory(interaction.user.id, 'long');
                    await interaction.reply('All chat history cleared!');
                } else {
                    await memoryManager.clearMemory(interaction.user.id, type);
                    await interaction.reply(`${type}-term memory cleared!`);
                }
                break;

            case 'model':
                const modelName = interaction.options.getString('name');
                try {
                    ollamaManager.setModel(modelName);
                    await interaction.reply(`Model changed to ${modelName}`);
                } catch (error) {
                    await interaction.reply('Failed to change model. Please check if the model exists.');
                }
                break;

            case 'listmodels':
                try {
                    const models = await ollamaManager.listModels();
                    const modelList = models.map(m => `- ${m.name}`).join('\n');
                    await interaction.reply(`Available models:\n${modelList}`);
                } catch (error) {
                    await interaction.reply('Failed to fetch available models.');
                }
                break;

            case 'delete':
                const modelToDelete = interaction.options.getString('name');
                try {
                    if (modelToDelete === 'muskchan1') {
                        return interaction.reply('Cannot delete the default model (muskchan1)');
                    }
                    await ollamaManager.deleteModel(modelToDelete);
                    await interaction.reply(`Successfully deleted model: ${modelToDelete}`);
                } catch (error) {
                    await interaction.reply(`Failed to delete model: ${error.message}`);
                }
                break;
        }
    },
}; 