import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { NormalizedBuildStats, NormalizedModule } from '../../../data/types';
import { formatBytes, getTypeColor, getShortModuleName } from '../utils/vscode';

interface GraphVisualizationProps {
    stats: NormalizedBuildStats | null;
    searchTerm: string;
    activeTypes: { [key: string]: boolean };
}

/**
 * React component for visualizing module dependencies as a force-directed graph using D3.js.
 */
const GraphVisualization: React.FC<GraphVisualizationProps> = ({ stats, searchTerm, activeTypes }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltipContent, setTooltipContent] = useState<NormalizedModule | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Memoize the filtered data to avoid unnecessary re-calculations
    const filteredModules = useCallback(() => {
        if (!stats) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return stats.modules.filter(module =>
            activeTypes[module.type] &&
            (module.name.toLowerCase().includes(lowerSearchTerm) ||
             module.path.toLowerCase().includes(lowerSearchTerm))
        );
    }, [stats, searchTerm, activeTypes]);

    useEffect(() => {
        if (!stats || !svgRef.current) {
            // Clear SVG if no stats or ref not ready
            d3.select(svgRef.current).selectAll('*').remove();
            return;
        }

        const modules = filteredModules();
        // Explicitly type links to match SimulationLinkDatum requirements
        const links: d3.SimulationLinkDatum<NormalizedModule>[] = []; 

        // Create links only between visible modules
        const visibleModuleIds = new Set(modules.map(m => m.id));
        modules.forEach(sourceModule => {
            sourceModule.dependencies.forEach(targetId => {
                if (visibleModuleIds.has(targetId)) {
                    // D3 forceLink expects source/target to be node objects or their IDs
                    links.push({ source: sourceModule.id, target: targetId });
                }
            });
        });

        // D3 setup
        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        // Clear previous content
        svg.selectAll('*').remove();

        // Add a group for zooming and panning
        const g = svg.append('g');

        // Define the simulation
        const simulation = d3.forceSimulation<NormalizedModule, d3.SimulationLinkDatum<NormalizedModule>>(modules)
            .force('link', d3.forceLink<NormalizedModule, d3.SimulationLinkDatum<NormalizedModule>>(links).id(d => d.id).distance(100).strength(0.7))
            .force('charge', d3.forceManyBody<NormalizedModule>().strength(-300)) // Repel nodes
            .force('center', d3.forceCenter<NormalizedModule>(width / 2, height / 2)) // Center the graph
            .force('collide', d3.forceCollide<NormalizedModule>(20)); // Prevent nodes from overlapping too much

        // Add links (edges)
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('class', 'link-line')
            .attr('stroke-width', 1);

        // Add nodes (circles for now)
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(modules)
            .enter().append('circle')
            .attr('class', 'node-circle')
            .attr('r', d => Math.max(5, Math.sqrt(d.size.raw) / 10)) // Radius based on size, min 5px
            .attr('fill', d => getTypeColor(d.type))
            .on('mouseover', (event, d) => {
                setTooltipContent(d);
                setTooltipPos({ x: event.clientX + 10, y: event.clientY + 10 });
            })
            .on('mouseout', () => {
                setTooltipContent(null);
            })
            .call(d3.drag<SVGCircleElement, NormalizedModule>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Add node labels (text)
        const label = g.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(modules)
            .enter().append('text')
            .attr('class', 'node-label')
            .text(d => getShortModuleName(d.name))
            .attr('pointer-events', 'none'); // Don't interfere with mouse events on circles

        // Update positions on each tick of the simulation
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as NormalizedModule).x || 0)
                .attr('y1', d => (d.source as NormalizedModule).y || 0)
                .attr('x2', d => (d.target as NormalizedModule).x || 0)
                .attr('y2', d => (d.target as NormalizedModule).y || 0);

            node
                .attr('cx', d => d.x || 0)
                .attr('cy', d => d.y || 0);

            label
                .attr('x', d => (d.x || 0) + (d3.select(node.nodes()[modules.indexOf(d)]).attr('r') as any / 2) + 5) // Offset label
                .attr('y', d => (d.y || 0) + 4); // Adjust for vertical centering
        });

        // Zoom functionality
        const zoom = d3.zoom<SVGSVGElement, any>()
            .scaleExtent([0.1, 4]) // Allow zooming from 10% to 400%
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom as any);

        // Drag functions
        function dragstarted(event: d3.D3DragEvent<SVGCircleElement, NormalizedModule, any>, d: NormalizedModule) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: d3.D3DragEvent<SVGCircleElement, NormalizedModule, any>, d: NormalizedModule) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: d3.D3DragEvent<SVGCircleElement, NormalizedModule, any>, d: NormalizedModule) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

    }, [stats, searchTerm, activeTypes, filteredModules]); // Re-run effect when stats or filters change

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <svg ref={svgRef} className="graph-svg"></svg>
            {tooltipContent && (
                <div
                    className="tooltip visible"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <strong>Module:</strong> {tooltipContent.name}<br />
                    <strong>Path:</strong> {tooltipContent.path}<br />
                    <strong>Size:</strong> {formatBytes(tooltipContent.size.raw)} ({tooltipContent.size.gzip ? formatBytes(tooltipContent.size.gzip) + ' gzipped' : 'N/A gzipped'})<br />
                    {tooltipContent.dependencies.length > 0 && (
                        <><strong>Dependencies:</strong> {tooltipContent.dependencies.map(id => getShortModuleName(id)).join(', ')}<br /></>
                    )}
                    {tooltipContent.dependents.length > 0 && (
                        <><strong>Dependents:</strong> {tooltipContent.dependents.map(id => getShortModuleName(id)).join(', ')}</>
                    )}
                </div>
            )}
        </div>
    );
};

export default GraphVisualization;
