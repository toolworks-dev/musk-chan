import fetch from 'node-fetch';

const MODELS = ['llama3.2:3b-instruct-q5_K_M'];
const OLLAMA_URL = 'http://ollama:11434';

async function pullModel(model) {
    console.log(`Pulling model: ${model}`);
    try {
        const response = await fetch(`${OLLAMA_URL}/api/pull`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: model
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to pull model ${model}`);
        }

        for await (const chunk of response.body) {
            const text = new TextDecoder().decode(chunk);
            console.log(text);
        }
    } catch (error) {
        console.error(`Error pulling model ${model}:`, error);
        throw error;
    }
}

async function main() {
    for (const model of MODELS) {
        await pullModel(model);
    }
}

main().catch(console.error);