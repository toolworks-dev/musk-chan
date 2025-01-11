import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MemoryManager {
    constructor() {
        this.baseDir = path.join(__dirname, '../memory');
        this.memoryDirs = ['short', 'long', 'individual'];
        this.initializeMemoryStructure();
    }

    async initializeMemoryStructure() {
        try {
            for (const dir of this.memoryDirs) {
                await fs.mkdir(path.join(this.baseDir, dir), { recursive: true });
            }
        } catch (error) {
            console.error('Error creating memory directories:', error);
        }
    }

    async loadMemory(userId, type = 'short') {
        try {
            const filePath = path.join(this.baseDir, type, `${userId}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async saveMemory(userId, memory, type = 'short') {
        try {
            const filePath = path.join(this.baseDir, type, `${userId}.json`);
            await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
        } catch (error) {
            console.error(`Error saving ${type} memory:`, error);
        }
    }

    async addToMemory(userId, interaction, type = 'short') {
        const memory = await this.loadMemory(userId, type);
        memory.push(interaction);

        if (type === 'short' && memory.length > 10) {
            memory.shift();
        }

        await this.saveMemory(userId, memory, type);
    }

    async clearMemory(userId, type = 'short') {
        try {
            const filePath = path.join(this.baseDir, type, `${userId}.json`);
            await fs.unlink(filePath);
        } catch (error) {
            console.error(`Error clearing ${type} memory:`, error);
        }
    }

    async getConversationContext(userId) {
        const shortMemory = await this.loadMemory(userId, 'short');
        const longMemory = await this.loadMemory(userId, 'long');
        
        return {
            recent: shortMemory,
            historical: longMemory.slice(-5)
        };
    }
}

export default new MemoryManager(); 