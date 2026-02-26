/**
 * Renders another player's cursor as a colored dot + name label
 * positioned in world coordinates on the canvas.
 */
export default function PlayerCursor({ player }) {
    const { name, color, cursor } = player;
    if (!cursor) return null;

    return (
        <div
            style={{
                position: 'absolute',
                left: cursor.x,
                top: cursor.y,
                pointerEvents: 'none',
                transform: 'translate(-4px, -4px)',
                zIndex: 9999,
            }}
        >
            {/* Cursor dot */}
            <div
                style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50% 50% 50% 0',
                    background: color || '#f59e0b',
                    border: '2px solid rgba(255,255,255,0.6)',
                    transform: 'rotate(-45deg)',
                    boxShadow: `0 0 6px ${color || '#f59e0b'}88`,
                }}
            />
            {/* Name label */}
            <div
                style={{
                    marginTop: 4,
                    marginLeft: 8,
                    background: color || '#f59e0b',
                    color: '#000',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                }}
            >
                {name}
            </div>
        </div>
    );
}
