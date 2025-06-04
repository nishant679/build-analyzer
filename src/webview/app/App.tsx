import React, { useState, useEffect, useCallback } from 'react';
// import Dashboard from './components/Dashboard';
import Dashboard from './components/Dashbord';
import FilterControls from './components/FilterControls';
import GraphVisualization from './components/GraphVisualization';
import TreemapVisualization from './components/TreemapVisualization';
import { postVsCodeMessage, onVsCodeMessage } from './utils/vscode';
import { NormalizedBuildStats } from '../../data/types';

// Define the types for the visualization modes
type VisualizationMode = 'graph' | 'treemap';

/**
 * The main React application component for the VS Code Webview.
 * It manages the overall state, handles communication with the extension host,
 * and renders the different visualization components.
 */
const App: React.FC = () => {
    // State to hold the normalized build statistics received from the extension host.
    const [stats, setStats] = useState<NormalizedBuildStats | null>(null);
    // State to track the currently selected visualization mode.
    const [vizMode, setVizMode] = useState<VisualizationMode>('graph');
    // State for the search term used to filter modules.
    const [searchTerm, setSearchTerm] = useState<string>('');
    // State for active module types to filter by (e.g., { js: true, css: false }).
    const [activeTypes, setActiveTypes] = useState<{ [key: string]: boolean }>({
        js: true, css: true, image: true, font: true, json: true, wasm: true, unknown: true
    });
    // State to display the currently loaded file path.
    const [filePath, setFilePath] = useState<string>('');
    // State to manage loading/error states.
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Callback to handle messages received from the VS Code extension host.
    const handleVsCodeMessage = useCallback((message: any) => {
        console.log('Webview received message:', message);
        setIsLoading(false); // Stop loading on any incoming message

        switch (message.type) {
            case 'BUILD_STATS_UPDATE':
                // When new build stats are received, update the state.
                setStats(message.payload);
                setError(null); // Clear any previous errors
                break;
            case 'FILE_PATH_UPDATE':
                // Update the displayed file path.
                setFilePath(message.payload.filePath);
                break;
            case 'ERROR':
                // Display error messages from the extension host.
                setError(message.payload.message);
                setStats(null); // Clear stats on error
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }, []);

    // Effect hook to set up message listening when the component mounts.
    useEffect(() => {
        // Inform the extension host that the webview is ready to receive data.
        postVsCodeMessage('WEBVIEW_READY');
        // Register the message listener.
        onVsCodeMessage(handleVsCodeMessage);
    }, [handleVsCodeMessage]); // Dependency array ensures effect runs only once on mount

    // Handler for changing the stats file path input.
    const handleFilePathChange = (path: string) => {
        setFilePath(path);
    };

    // Handler for the "Load & Visualize" button click.
    const handleLoadStats = () => {
        if (filePath) {
            setIsLoading(true); // Start loading
            setError(null); // Clear previous errors
            setStats(null); // Clear previous stats
            // Request the extension host to load the specified file.
            postVsCodeMessage('REQUEST_LOAD_STATS_FILE', { filePath });
        } else {
            setError('Please provide a stats file path.');
        }
    };

    // Handler for search term changes.
    const handleSearchChange = (term: string) => {
        setSearchTerm(term);
    };

    // Handler for toggling module type filters.
    const handleToggleType = (type: string) => {
        setActiveTypes(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    // Determine content for the visualization area based on state.
    const renderVisualizationContent = () => {
        if (isLoading) {
            return (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Loading build data...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="error-overlay">
                    <p>⚠️ Error loading data ⚠️</p>
                    <p className="message">{error}</p>
                </div>
            );
        }

        if (!stats) {
            return (
                <div className="no-data-overlay">
                    <p>No build data loaded. Select a stats file to begin visualization.</p>
                    <p>Example: `webpack --json  stats.json`</p>
                </div>
            );
        }

        // Render the selected visualization component.
        if (vizMode === 'graph') {
            return <GraphVisualization stats={stats} searchTerm={searchTerm} activeTypes={activeTypes} />;
        } else {
            return <TreemapVisualization stats={stats} searchTerm={searchTerm} activeTypes={activeTypes} />;
        }
    };

    return (
        <div className="container">
            <div className="header">
                <label htmlFor="file-path-input">Stats File Path:</label>
                <input
                    id="file-path-input"
                    type="text"
                    value={filePath}
                    onChange={(e) => handleFilePathChange(e.target.value)}
                    placeholder="/path/to/project/dist/stats.json"
                />
                <button className="button" onClick={handleLoadStats} disabled={isLoading}>
                    Load & Visualize
                </button>
                <div className="button-group">
                    <button
                        className={`button ${vizMode === 'graph' ? 'active' : ''}`}
                        onClick={() => setVizMode('graph')}
                    >
                        Dependency Graph
                    </button>
                    <button
                        className={`button ${vizMode === 'treemap' ? 'active' : ''}`}
                        onClick={() => setVizMode('treemap')}
                    >
                        Bundle Treemap
                    </button>
                </div>
            </div>

            <Dashboard
                stats={stats}
                filePath={filePath}
                onFilePathChange={handleFilePathChange}
                onLoadStats={handleLoadStats}
            />
            <FilterControls
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                activeTypes={activeTypes}
                onToggleType={handleToggleType}
            />

            <div className="visualization-area">
                {renderVisualizationContent()}
            </div>
        </div>
    );
};

export default App;
