import { NormalizedBuildStats, NormalizedModule } from '../../../data/types'; // Corrected import path

/**
 * A wrapper around the VS Code Webview API (`acquireVsCodeApi`).
 * This provides a type-safe way to post messages to the extension host
 * and listen for messages from it.
 */
interface VsCodeApi {
    postMessage(message: any): void;
    setState(newState: any): void;
    getState(): any;
}

// Declare the VS Code API globally available in the webview context.
declare const vscode: VsCodeApi;

/**
 * Posts a message to the VS Code extension host.
 * @param type The type of the message (e.g., 'WEBVIEW_READY', 'REQUEST_LOAD_STATS_FILE').
 * @param payload The data payload of the message.
 */
export function postVsCodeMessage(type: string, payload?: any) {
    if (typeof vscode !== 'undefined') {
        vscode.postMessage({ type, payload });
    } else {
        console.warn('VS Code API not available in this context.');
    }
}

/**
 * Sets up a listener for messages coming from the VS Code extension host.
 * @param callback A function to be called with the message payload.
 */
export function onVsCodeMessage(callback: (message: any) => void) {
    if (typeof vscode !== 'undefined') {
        window.addEventListener('message', event => {
            const message = event.data; // The JSON data from the extension host
            callback(message);
        });
    } else {
        console.warn('VS Code API not available for message listening.');
    }
}

/**
 * Helper function to format bytes into a human-readable string (e.g., KB, MB).
 * @param bytes The size in bytes.
 * @returns A formatted string.
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to format milliseconds into a human-readable string (e.g., s, ms).
 * @param ms The time in milliseconds.
 * @returns A formatted string.
 */
export function formatTime(ms: number): string {
    if (ms < 1000) {
        return `${ms.toFixed(0)} ms`;
    }
    return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Returns a color based on module type for visualization.
 * @param type The type of the module ('js', 'css', 'image', etc.).
 * @returns A hex color string.
 */
export function getTypeColor(type: string): string {
    switch (type) {
        case 'js': return '#007ACC'; // VS Code blue
        case 'css': return '#28A745'; // Green
        case 'image': return '#FFC107'; // Orange
        case 'font': return '#6F42C1'; // Purple
        case 'json': return '#FF6F00'; // Darker orange
        case 'wasm': return '#663399'; // Rebeccapurple
        case 'map': return '#999999'; // Gray for source maps
        case 'html': return '#E34C26'; // HTML orange
        case 'unknown': return '#BBBBBB'; // Light gray
        default: return '#BBBBBB';
    }
}

/**
 * Helper to get short name for module path.
 * @param path The full module path.
 * @returns A shortened name.
 */
export function getShortModuleName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1];
}

/**
 * Sorts modules by size in descending order.
 * @param modules Array of NormalizedModule.
 * @returns Sorted array.
 */
export function sortModulesBySize(modules: NormalizedModule[]): NormalizedModule[] {
    return [...modules].sort((a, b) => (b.size.raw || 0) - (a.size.raw || 0));
}
