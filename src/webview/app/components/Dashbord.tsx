import React from 'react';
import { NormalizedBuildStats, NormalizedModule } from '../../../data/types';
import { formatBytes, formatTime, sortModulesBySize } from '../utils/vscode';

interface DashboardProps {
    stats: NormalizedBuildStats | null;
    filePath: string;
    onFilePathChange: (path: string) => void;
    onLoadStats: () => void;
}

/**
 * React component for displaying the summary dashboard and file loading controls.
 * This includes total size, build time, and top largest modules.
 */
const Dashboard: React.FC<DashboardProps> = ({ stats, filePath, onFilePathChange, onLoadStats }) => {
    const topModules: NormalizedModule[] = stats ? sortModulesBySize(stats.modules).slice(0, 5) : [];

    return (
        <div className="summary-controls">
            <div className="summary-section">
                <h3>Summary:</h3>
                <ul>
                    <li>Total Bundle Size: <strong>{stats ? formatBytes(stats.totalSize.raw) : 'N/A'}</strong> ({stats?.totalSize.gzip ? formatBytes(stats.totalSize.gzip) + ' gzipped' : 'N/A gzipped'})</li>
                    <li>Total Build Time: <strong>{stats?.totalTime ? formatTime(stats.totalTime) : 'N/A'}</strong></li>
                    <li>Modules: <strong>{stats ? stats.modules.length : 'N/A'}</strong> | Assets: <strong>{stats ? stats.assets.length : 'N/A'}</strong></li>
                </ul>

                {stats && topModules.length > 0 && (
                    <>
                        <h3>Top 5 Largest Modules:</h3>
                        <ul>
                            {topModules.map((module, index) => (
                                <li key={module.id}>
                                    {index + 1}. {module.name} (<strong>{formatBytes(module.size.raw)}</strong>)
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
