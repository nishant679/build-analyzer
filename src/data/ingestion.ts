import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { WebpackStats } from './types';

/**
 * Reads a JSON file from the given file path and parses its content.
 * This function is generic and can be used for any JSON file.
 *
 * @param filePath The absolute path to the JSON file.
 * @returns A promise that resolves with the parsed JSON object.
 * @throws An error if the file cannot be read or if the content is not valid JSON.
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
    try {
        // Read the file content as a string.
        const fileContent = await fs.readFile(filePath, 'utf-8');
        // Parse the string content as JSON.
        const parsedData: T = JSON.parse(fileContent);
        return parsedData;
    } catch (error: any) {
        // Provide more specific error messages for common issues.
        if (error.code === 'ENOENT') {
            throw new Error(`File not found at path: ${filePath}`);
        } else if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON format in file: ${filePath}. Details: ${error.message}`);
        } else {
            throw new Error(`Failed to read or parse file ${filePath}: ${error.message}`);
        }
    }
}

/**
 * Loads a Webpack stats.json file.
 * This function specifically types the output for WebpackStats.
 *
 * @param filePath The absolute path to the Webpack stats.json file.
 * @returns A promise that resolves with the parsed WebpackStats object.
 */
export async function loadWebpackStats(filePath: string): Promise<WebpackStats> {
    // Use the generic readJsonFile function, casting the result to WebpackStats.
    const stats = await readJsonFile<WebpackStats>(filePath);
    // You might add basic validation here to ensure it looks like a stats.json
    if (!stats || (!stats.assets && !stats.modules && !stats.chunks)) {
        throw new Error('The selected file does not appear to be a valid Webpack stats.json.');
    }
    return stats;
}

// --- Mock Stats Data for Development ---
// This provides a fallback for testing without needing a real build output.
// In a real scenario, you'd generate a stats.json from your project.
export const mockWebpackStats: WebpackStats = {
    time: 5200, // Mock total build time in ms
    assets: [
        { name: 'main.js', size: 1200000, chunks: ['main'] }, // 1.2 MB
        { name: 'vendors.js', size: 800000, chunks: ['vendors'] }, // 0.8 MB
        { name: 'style.css', size: 150000, chunks: ['main'] }, // 0.15 MB
        { name: 'logo.png', size: 75000, chunks: [] }, // 0.075 MB
        { name: 'app.js.map', size: 300000, chunks: ['main'] }
    ],
    modules: [
        { id: './src/index.js', name: './src/index.js', size: 50000, reasons: [{ moduleIdentifier: './src/App.js', type: 'harmony import' }], chunks: ['main'] },
        { id: './src/App.js', name: './src/App.js', size: 80000, reasons: [{ moduleIdentifier: './src/components/Button.js', type: 'harmony import' }, { moduleIdentifier: './node_modules/react/index.js', type: 'harmony import' }], chunks: ['main'] },
        { id: './src/components/Button.js', name: './src/components/Button.js', size: 15000, reasons: [{ moduleIdentifier: './src/App.js', type: 'harmony import' }], chunks: ['main'] },
        { id: './node_modules/react/index.js', name: './node_modules/react/index.js', size: 180000, reasons: [{ moduleIdentifier: './src/App.js', type: 'harmony import' }], chunks: ['vendors'] },
        { id: './node_modules/lodash/index.js', name: './node_modules/lodash/index.js', size: 250000, reasons: [{ moduleIdentifier: './src/utils/data.js', type: 'harmony import' }], chunks: ['vendors'] },
        { id: './src/utils/data.js', name: './src/utils/data.js', size: 10000, reasons: [{ moduleIdentifier: './src/App.js', type: 'harmony import' }], chunks: ['main'] },
        { id: './src/styles/main.css', name: './src/styles/main.css', size: 70000, reasons: [], chunks: ['main'] }
    ],
    chunks: [
        { id: 'main', names: ['main'], size: 1350000, modules: [
            { id: './src/index.js', name: './src/index.js', size: 50000 },
            { id: './src/App.js', name: './src/App.js', size: 80000 },
            { id: './src/components/Button.js', name: './src/components/Button.js', size: 15000 },
            { id: './src/utils/data.js', name: './src/utils/data.js', size: 10000 },
            { id: './src/styles/main.css', name: './src/styles/main.css', size: 70000 }
        ]},
        { id: 'vendors', names: ['vendors'], size: 430000, modules: [
            { id: './node_modules/react/index.js', name: './node_modules/react/index.js', size: 180000 },
            { id: './node_modules/lodash/index.js', name: './node_modules/lodash/index.js', size: 250000 }
        ]}
    ]
};
