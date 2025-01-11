import fetch from 'node-fetch';
import { Collection } from 'discord.js';
import fs from 'fs/promises';
import { dirname } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import memoryManager from './memoryManager.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf8'));

class OllamaManager {
    constructor() {
        this.baseUrl = config.ollamaUrl || 'http://ollama:11434';
        this.model = 'muskchan2';
    }

    async chat(userId, prompt) {
        try {
            const context = await memoryManager.getConversationContext(userId);
            const messages = this.formatConversation([...context.recent, ...context.historical], prompt);

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: messages,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        top_k: 40,
                    }
                })
            });

            const data = await response.json();
            
            // Save to both short and long-term memory
            await memoryManager.addToMemory(userId, { role: 'user', content: prompt }, 'short');
            await memoryManager.addToMemory(userId, { role: 'assistant', content: data.response }, 'short');
            await memoryManager.addToMemory(userId, { role: 'user', content: prompt }, 'long');
            await memoryManager.addToMemory(userId, { role: 'assistant', content: data.response }, 'long');

            return data.response;
        } catch (error) {
            console.error('Error in Ollama chat:', error);
            throw error;
        }
    }

    formatConversation(history, newPrompt) {
        let formattedPrompt = this.systemPrompt + '\n\n';

        for (const msg of history) {
            formattedPrompt += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
        }

        formattedPrompt += `Human: ${newPrompt}\nAssistant:`;
        return formattedPrompt;
    }

    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            const data = await response.json();
            return data.models;
        } catch (error) {
            console.error('Error listing models:', error);
            throw error;
        }
    }

    async setModel(modelName) {
        try {
            const models = await this.listModels();
            const modelExists = models.some(m => m.name === modelName);
            
            if (!modelExists) {
                console.log(`Model ${modelName} not found, attempting to pull...`);
                await this.pullModel(modelName);
            }
            
            this.model = modelName;
        } catch (error) {
            console.error(`Error setting model ${modelName}:`, error);
            throw new Error(`Failed to set model ${modelName}`);
        }
    }

    async pullModel(modelName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: modelName
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to pull model ${modelName}`);
            }
            
            while (true) {
                const data = await response.json();
                if (data.status === 'success' || data.status === 'error') {
                    break;
                }
            }
        } catch (error) {
            console.error(`Error pulling model ${modelName}:`, error);
            throw error;
        }
    }

    async deleteModel(modelName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: modelName
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to delete model ${modelName}`);
            }

            if (this.model === modelName) {
                this.model = 'muskchan1';
            }
        } catch (error) {
            console.error(`Error deleting model ${modelName}:`, error);
            throw error;
        }
    }
}

export default new OllamaManager(); 