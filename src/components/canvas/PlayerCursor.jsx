import useGameStore from '../../store/gameStore';

/**
 * Renders another player's cursor as a colored dot + name label + hand count
 * positioned in world coordinates on the canvas.
 */
export default function PlayerCursor({ player }) {
    const { id, name, color, cursor } = player;
    const { objects } = useGameStore();

    if (!cursor) return null;

    const handCount = objects.filter(o => o.ownerId === id).length;

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
            {/* Name label + Hand count */}
            <div
                style={{
                    marginTop: 4,
                    marginLeft: 8,
                    background: color || '#f59e0b',
                    color: '#000',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}
            >
                <span>{name}</span>
                {handCount > 0 && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/20 rounded border border-black/10">
                        <span>✋</span>
                        <span>{handCount}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
