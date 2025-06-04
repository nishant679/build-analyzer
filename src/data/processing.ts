import { WebpackStats, NormalizedBuildStats, NormalizedModule, NormalizedAsset, NormalizedChunk } from './types';
import { loadWebpackStats, mockWebpackStats } from './ingestion'; // Import mock data for testing

/**
 * Calculates a very rough gzipped size approximation.
 * This is a placeholder and not accurate for real-world scenarios.
 * For true gzipped size, you'd need a compression library or actual compressed data from stats.
 * A common rule of thumb for JS/CSS is 1/3 to 1/4 of raw size.
 *
 * @param rawSize The raw size in bytes.
 * @returns An approximated gzipped size.
 */
function approximateGzipSize(rawSize: number): number {
    // This is a very rough approximation. Real gzip depends on content.
    return Math.floor(rawSize * 0.3); // Assume ~30% compression
}

/**
 * Determines the type of a module or asset based on its file extension.
 *
 * @param name The name or path of the module/asset.
 * @returns A categorized type string.
 */
function getTypeFromName(name: string): NormalizedModule['type'] | NormalizedAsset['type'] {
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('.js') || lowerName.endsWith('.jsx') || lowerName.endsWith('.ts') || lowerName.endsWith('.tsx')) {
        return 'js';
    }
    if (lowerName.endsWith('.css') || lowerName.endsWith('.scss') || lowerName.endsWith('.less')) {
        return 'css';
    }
    if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.gif') || lowerName.endsWith('.svg')) {
        return 'image';
    }
    if (lowerName.endsWith('.woff') || lowerName.endsWith('.woff2') || lowerName.endsWith('.ttf') || lowerName.endsWith('.otf')) {
        return 'font';
    }
    if (lowerName.endsWith('.json')) {
        return 'json';
    }
    if (lowerName.endsWith('.wasm')) {
        return 'wasm';
    }
    if (lowerName.endsWith('.map')) {
        return 'map';
    }
    if (lowerName.endsWith('.html')) {
        return 'html';
    }
    return 'unknown';
}

/**
 * Normalizes Webpack stats into a generic, unified format for the visualizer.
 * This function processes raw Webpack data to create the `NormalizedBuildStats` structure.
 *
 * @param rawStats The raw WebpackStats object.
 * @returns A NormalizedBuildStats object.
 */
function normalizeWebpackStats(rawStats: WebpackStats): NormalizedBuildStats {
    const normalizedModules: NormalizedModule[] = [];
    const normalizedAssets: NormalizedAsset[] = [];
    const normalizedChunks: NormalizedChunk[] = [];
    const moduleMap = new Map<string, NormalizedModule>(); // Map for quick lookup by ID
    const entrypoints: string[] = [];

    // --- Process Modules ---
    if (rawStats.modules) {
        rawStats.modules.forEach(m => {
            const id = String(m.id); // Ensure ID is a string
            const normalizedModule: NormalizedModule = {
                id: id,
                name: m.name.split('/').pop() || m.name, // Use last part of path as name
                path: m.name, // Full original path
                size: {
                    raw: m.size,
                    gzip: approximateGzipSize(m.size)
                },
                type: getTypeFromName(m.name) as NormalizedModule['type'], // Cast to ensure it matches the type
                dependencies: [], // Will be filled in a second pass
                dependents: [], // Will be filled in a second pass
                buildTime: undefined, // Not typically in module-level stats
                x: undefined, // D3 simulation properties
                y: undefined,
                vx: undefined,
                vy: undefined,
                fx: undefined,
                fy: undefined
            };
            normalizedModules.push(normalizedModule);
            moduleMap.set(id, normalizedModule);
        });

        // Second pass to resolve dependencies and dependents
        rawStats.modules.forEach(m => {
            const sourceModuleId = String(m.id);
            const sourceModule = moduleMap.get(sourceModuleId);

            if (sourceModule && m.reasons) {
                m.reasons.forEach(reason => {
                    const targetModuleId = String(reason.moduleIdentifier);
                    // Add to source's dependencies if target exists and isn't self
                    if (moduleMap.has(targetModuleId) && sourceModuleId !== targetModuleId) {
                        sourceModule.dependencies.push(targetModuleId);
                        // Add to target's dependents
                        const targetModule = moduleMap.get(targetModuleId);
                        if (targetModule) {
                            targetModule.dependents.push(sourceModuleId);
                        }
                    }
                });
            }
        });
    }

    // --- Process Assets ---
    let totalRawSize = 0;
    let totalGzipSize = 0;
    if (rawStats.assets) {
        rawStats.assets.forEach(a => {
            const normalizedAsset: NormalizedAsset = {
                name: a.name,
                size: {
                    raw: a.size,
                    gzip: approximateGzipSize(a.size)
                },
                type: getTypeFromName(a.name) as NormalizedAsset['type'], // Cast to ensure it matches the type
                chunks: a.chunks ? a.chunks.map(String) : []
            };
            normalizedAssets.push(normalizedAsset);
            totalRawSize += a.size;
            totalGzipSize += normalizedAsset.size.gzip || 0;
        });
    }

    // --- Process Chunks ---
    if (rawStats.chunks) {
        rawStats.chunks.forEach(c => {
            const id = String(c.id);
            const normalizedChunk: NormalizedChunk = {
                id: id,
                name: c.names && c.names.length > 0 ? c.names[0] : id,
                size: {
                    raw: c.size,
                    gzip: approximateGzipSize(c.size)
                },
                modules: c.modules ? c.modules.map(m => String(m.id)) : []
            };
            normalizedChunks.push(normalizedChunk);
        });
    }

    // --- Determine Entrypoints (Simplified: chunks with names are often entrypoints) ---
    normalizedChunks.forEach(chunk => {
        if (chunk.name && chunk.modules.length > 0) {
            // Find the first module in the chunk that is also a normalized module
            const firstModuleInChunk = chunk.modules.find(moduleId => moduleMap.has(moduleId));
            if (firstModuleInChunk) {
                entrypoints.push(firstModuleInChunk);
            }
        }
    });


    return {
        timestamp: Date.now(), // Use current time or parse from stats if available
        totalSize: {
            raw: totalRawSize,
            gzip: totalGzipSize
        },
        totalTime: rawStats.time,
        modules: normalizedModules,
        assets: normalizedAssets,
        chunks: normalizedChunks,
        entrypoints: entrypoints
    };
}

/**
 * Main function to load and process a build stats file.
 * It currently supports Webpack stats.json.
 *
 * @param filePath The absolute path to the stats file.
 * @returns A promise that resolves with the normalized build stats.
 */
export async function loadAndProcessStatsFile(filePath: string): Promise<NormalizedBuildStats> {
    // In a real application, you would detect the bundler type from the file content
    // or file name, and call the appropriate loader/normalizer.
    // For this MVP, we assume it's a Webpack stats.json.

    // For demonstration, you could uncomment the line below to use mock data
    // return normalizeWebpackStats(mockWebpackStats);

    const rawStats = await loadWebpackStats(filePath);
    return normalizeWebpackStats(rawStats);
}
