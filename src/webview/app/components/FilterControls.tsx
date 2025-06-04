import React from 'react';

interface FilterControlsProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    activeTypes: { [key: string]: boolean };
    onToggleType: (type: string) => void;
}

/**
 * React component for filtering and searching modules in the visualization.
 * Allows filtering by type (JS, CSS, Image, etc.) and searching by name.
 */
const FilterControls: React.FC<FilterControlsProps> = ({
    searchTerm,
    onSearchChange,
    activeTypes,
    onToggleType
}) => {
    const moduleTypes = ['js', 'css', 'image', 'font', 'json', 'wasm', 'unknown'];

    return (
        <div className="filters-section">
            <h3>Filters:</h3>
            <div className="filter-group">
                <label htmlFor="search-input">Search:</label>
                <input
                    id="search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search modules..."
                />
            </div>
            <div className="filter-group">
                <label>Show:</label>
                {moduleTypes.map(type => (
                    <label key={type}>
                        <input
                            type="checkbox"
                            checked={activeTypes[type]}
                            onChange={() => onToggleType(type)}
                        />
                        {type.toUpperCase()}
                    </label>
                ))}
            </div>
        </div>
    );
};

export default FilterControls;
