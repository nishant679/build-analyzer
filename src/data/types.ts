import * as d3 from 'd3'; // Import d3 for SimulationNodeDatum

/**
 * Defines the normalized structure for a single module in the build.
 * This is the common format used by the visualization components.
 */
export interface NormalizedModule extends d3.SimulationNodeDatum { // Extend D3's node datum for graph
    id: string; // Unique identifier (e.g., module path, or internal ID from bundler)
    name: string; // Display name (e.g., 'MyComponent.js', 'lodash')
    path: string; // Full file path relative to project root or absolute
    size: {
        raw: number; // Size in bytes
        gzip?: number; // Gzipped size in bytes (optional)
    };
    type: 'js' | 'css' | 'image' | 'font' | 'json' | 'wasm' | 'unknown' | 'map' | 'html'; // Categorized file type
    dependencies: string[]; // Array of IDs of modules this module depends on
    dependents: string[]; // Array of IDs of modules that depend on this module
    buildTime?: number; // Optional: time taken to build this module (if available from stats)
}

/**
 * Defines the normalized structure for a single asset in the build.
 * Assets are the final output files (e.g., bundle.js, style.css, image.png).
 */
export interface NormalizedAsset {
    name: string; // Asset filename (e.g., 'main.bundle.js', 'logo.png')
    size: {
        raw: number; // Size in bytes
        gzip?: number; // Gzipped size in bytes (optional)
    };
    type: 'js' | 'css' | 'image' | 'font' | 'map' | 'html' | 'unknown'; // Categorized asset type
    chunks: string[]; // List of chunk IDs this asset belongs to
}

/**
 * Defines the normalized structure for a single chunk in the build.
 * Chunks are logical groupings of modules, often corresponding to entry points or code splits.
 */
export interface NormalizedChunk {
    id: string; // Unique chunk ID
    name: string; // Chunk name (e.g., 'main', 'vendors')
    size: {
        raw: number; // Size in bytes
        gzip?: number; // Gzipped size in bytes (optional)
    };
    modules: string[]; // Array of module IDs included in this chunk
}

/**
 * Defines the overall normalized build statistics.
 * This is the top-level data structure sent to the Webview.
 */
export interface NormalizedBuildStats {
    timestamp: number; // Timestamp of when the build was generated
    totalSize: {
        raw: number; // Total raw size of all assets/chunks
        gzip?: number; // Total gzipped size (optional)
    };
    totalTime?: number; // Overall build time in milliseconds (optional)
    modules: NormalizedModule[]; // List of all normalized modules
    assets: NormalizedAsset[]; // List of all normalized assets
    chunks: NormalizedChunk[]; // List of all normalized chunks
    entrypoints: string[]; // Array of module IDs that are entry points
}

// --- Raw Webpack Stats Interfaces (Simplified for parsing example) ---
// These interfaces represent a very simplified subset of a real Webpack stats.json
// A full implementation would need to parse a much more complex structure.

export interface WebpackModule {
    id: string | number;
    name: string;
    size: number; // Raw size in bytes
    // In a real stats.json, dependencies are often in `reasons` or `modules` within chunks
    // For simplicity here, we'll assume a direct 'modules' array with 'id' and 'dependencies'
    modules?: WebpackModule[]; // For concatenated modules
    reasons?: { moduleIdentifier: string; type: string }[]; // Simplified reasons for dependencies
    chunks?: (string | number)[]; // Chunks this module belongs to
}

export interface WebpackAsset {
    name: string;
    size: number; // Raw size in bytes
    chunks?: (string | number)[];
    // In a real stats.json, gzipped size might be in `info.minimized` or separate plugin output
    // For this MVP, we'll calculate it or assume it's not present.
}

export interface WebpackChunk {
    id: string | number;
    names: string[];
    size: number;
    modules?: WebpackModule[]; // Modules directly in this chunk
}

export interface WebpackStats {
    time?: number; // Total build time
    assets?: WebpackAsset[];
    modules?: WebpackModule[];
    chunks?: WebpackChunk[];
    // Many other properties exist in a full stats.json
}
