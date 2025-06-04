import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { NormalizedBuildStats, NormalizedModule, NormalizedChunk } from '../../../data/types';
import { formatBytes, getTypeColor, getShortModuleName } from '../utils/vscode';

// Define the TreemapNodeData interface outside the component for broader accessibility
export interface TreemapNodeData { // Added 'export' keyword
    name: string;
    path: string;
    children?: TreemapNodeData[];
    value?: number; // Sum of children's values or module's raw size
    type: NormalizedModule['type'] | 'folder'; // Type for coloring
    data?: NormalizedModule; // Reference to original module data for leaf nodes
    size?: { raw: number; gzip?: number; }; // Added for tooltip consistency when it's a folder
}

interface TreemapVisualizationProps {
    stats: NormalizedBuildStats | null;
    searchTerm: string;
    activeTypes: { [key: string]: boolean };
}

/**
 * React component for visualizing bundle size as a treemap using D3.js.
 */
const TreemapVisualization: React.FC<TreemapVisualizationProps> = ({ stats, searchTerm, activeTypes }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    // Updated tooltipContent to also accept TreemapNodeData for folder tooltips
    const [tooltipContent, setTooltipContent] = useState<NormalizedModule | NormalizedChunk | TreemapNodeData | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [currentPath, setCurrentPath] = useState<string[]>([]); // For breadcrumb navigation

    // Memoize the filtered data
    const filteredModules = useCallback(() => {
        if (!stats) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return stats.modules.filter(module =>
            activeTypes[module.type] &&
            (module.name.toLowerCase().includes(lowerSearchTerm) ||
             module.path.toLowerCase().includes(lowerSearchTerm))
        );
    }, [stats, searchTerm, activeTypes]);

    // Function to handle breadcrumb clicks
    const handleBreadcrumbClick = useCallback((index: number) => {
        const newPath = currentPath.slice(0, index + 1);
        setCurrentPath(newPath);
    }, [currentPath]);

    useEffect(() => {
        if (!stats || !svgRef.current) {
            d3.select(svgRef.current).selectAll('*').remove();
            return;
        }

        const modules = filteredModules();
        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        svg.selectAll('*').remove(); // Clear previous content

        const rootData: TreemapNodeData = {
            name: 'root',
            path: '',
            children: [],
            type: 'folder', // Root is a folder
            value: 0 // Will be summed
        };

        modules.forEach(module => {
            const pathParts = module.path.split('/');
            let currentParent: TreemapNodeData = rootData;
            let currentPathArray: string[] = [];

            // Build hierarchy based on path
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                currentPathArray.push(part);
                const fullPath = currentPathArray.join('/');

                let existingChild = currentParent.children?.find((c: TreemapNodeData) => c.name === part);

                if (!existingChild) {
                    existingChild = {
                        name: part,
                        path: fullPath,
                        children: [],
                        value: 0, // Will sum up later
                        type: i === pathParts.length - 1 ? module.type : 'folder' // Last part is module, others are folders
                    };
                    currentParent.children?.push(existingChild);
                }
                currentParent = existingChild;
            }
            // Assign the module's size to the leaf node
            currentParent.value = module.size.raw;
            currentParent.data = module; // Store original module data for tooltip
            currentParent.size = module.size; // Store size for tooltip consistency
        });

        // D3 Treemap setup
        const root = d3.hierarchy(rootData)
            .sum(d => d.value || 0) // Ensure value is treated as number
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        const treemap = d3.treemap<TreemapNodeData>()
            .size([width, height])
            .padding(1)
            .round(true);

        // Function to render the treemap for a given node
        const renderTreemap = (node: d3.HierarchyNode<TreemapNodeData>) => {
            svg.selectAll('*').remove(); // Clear previous content

            const t = treemap(node); // Compute treemap layout for the current node

            const cell = svg.selectAll('g')
                .data(t.leaves()) // Only render leaf nodes for current view
                .enter().append('g')
                .attr('transform', d => `translate(${d.x0},${d.y0})`);

            cell.append('rect')
                .attr('class', 'treemap-rect')
                .attr('width', d => d.x1 - d.x0)
                .attr('height', d => d.y1 - d.y0)
                .attr('fill', d => getTypeColor(d.data.type))
                .on('mouseover', (event, d) => {
                    // For tooltip, use the original module data if it's a leaf, otherwise use the TreemapNodeData
                    setTooltipContent(d.data.data || d.data);
                    setTooltipPos({ x: event.clientX + 10, y: event.clientY + 10 });
                })
                .on('mouseout', () => {
                    setTooltipContent(null);
                })
                .on('click', (event, d) => {
                    // Drill down if it's a folder (has children)
                    if (d.data.children && d.data.children.length > 0) {
                        setCurrentPath(d.data.path.split('/'));
                    }
                });

            cell.append('text')
                .attr('class', 'treemap-label')
                .attr('x', 4)
                .attr('y', 14)
                .text(d => {
                    const name = getShortModuleName(d.data.name);
                    // Only show label if there's enough space
                    return (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 20) ? name : '';
                });
        };

        // Render the initial treemap (root)
        // Update treemap when currentPath changes
        const currentRootNode = currentPath.length === 0
            ? root
            : root.descendants().find(d => d.data.path === currentPath.join('/')) || root;

        renderTreemap(currentRootNode);

    }, [stats, searchTerm, activeTypes, filteredModules, currentPath]); // Re-run effect when stats, filters, or path change

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div className="breadcrumb">
                <span onClick={() => setCurrentPath([])}>Root</span>
                {currentPath.map((part, index) => (
                    <React.Fragment key={index}>
                        <span className="separator">/</span>
                        <span onClick={() => handleBreadcrumbClick(index)}>{part}</span>
                    </React.Fragment>
                ))}
            </div>
            <svg ref={svgRef} className="treemap-svg"></svg>
            {tooltipContent && (
                <div
                    className="tooltip visible"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <strong>Name:</strong> {tooltipContent.name}<br />
                    {('path' in tooltipContent) && <><strong>Path:</strong> {tooltipContent.path}<br /></>}
                    {/* Check if tooltipContent has a size property before accessing it */}
                    {tooltipContent.size && (
                        <>
                            <strong>Size:</strong> {formatBytes(tooltipContent.size.raw)} ({tooltipContent.size.gzip ? formatBytes(tooltipContent.size.gzip) + ' gzipped' : 'N/A gzipped'})
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TreemapVisualization;
