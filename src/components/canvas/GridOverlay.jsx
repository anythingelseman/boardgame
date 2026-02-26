/**
 * SVG dot-grid overlay rendered in world space.
 * The grid spacing appears consistent regardless of zoom level.
 */
export default function GridOverlay({ scale }) {
    const spacing = 40; // world-space units between dots
    return (
        <div className="grid-overlay" style={{ backgroundSize: `${spacing}px ${spacing}px` }} />
    );
}
