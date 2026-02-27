import { useRef, useState, useCallback, useEffect } from 'react';
import useGameStore from '../../store/gameStore';
import useRoomStore from '../../store/roomStore';
import useContextMenu from '../../hooks/useContextMenu';
import GameCard from '../objects/GameCard';
import GameToken from '../objects/GameToken';
import GameTile from '../objects/GameTile';
import GameBoard from '../objects/GameBoard';
import ContextMenu from '../ui/ContextMenu';
import GridOverlay from './GridOverlay';
import PlayerCursor from './PlayerCursor';

export default function GameCanvas({
    transform, handlers, isPanning, isSpaceHeld, screenToWorld, broadcastCursor, onViewImage,
    placementCard, onPlacementConfirm, onPlacementCancel, onPlayCard,
    sidebarCollapsed, sidebarW,
}) {
    const { objects, showGrid, deselectAll, selectMany, selectedIds } = useGameStore();
    const { players, playerId } = useRoomStore();
    const { menu, open, close } = useContextMenu();

    const cursorThrottle = useRef(null);
    const marqueeRef = useRef(null);
    const [marquee, setMarquee] = useState(null);

    // Track mouse position in screen coords for the ghost card
    const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

    // ── Placement mode: track mouse ───────────────────────────────────────
    useEffect(() => {
        if (!placementCard) return;
        const onMove = (e) => setGhostPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
    }, [placementCard]);

    // ── Pointer down: start marquee if plain left-click on canvas ────────
    const handlePointerDown = useCallback((e) => {
        // In placement mode, left-click places, right-click cancels
        if (placementCard) {
            e.stopPropagation();
            if (e.button === 0) {
                const world = screenToWorld(e.clientX, e.clientY);
                onPlacementConfirm?.(world.x, world.y);
            } else if (e.button === 2) {
                e.preventDefault(); // Stop native context menu
                onPlacementCancel?.();
            }
            return;
        }

        handlers.onPointerDown(e);
        if (e.button === 0 && !isSpaceHeld()) {
            marqueeRef.current = { startX: e.clientX, startY: e.clientY };
            setMarquee(null);
        }
    }, [handlers, isSpaceHeld, placementCard, screenToWorld, onPlacementConfirm, onPlacementCancel]);

    // ── Pointer move: update marquee rect + broadcast cursor ─────────────
    const handlePointerMove = useCallback((e) => {
        if (placementCard) return; // skip canvas logic during placement

        handlers.onPointerMove(e);

        if (marqueeRef.current) {
            const sx = marqueeRef.current.startX;
            const sy = marqueeRef.current.startY;
            const ex = e.clientX;
            const ey = e.clientY;
            setMarquee({
                x: Math.min(sx, ex),
                y: Math.min(sy, ey),
                w: Math.abs(ex - sx),
                h: Math.abs(ey - sy),
            });
        }

        const clientX = e.clientX;
        const clientY = e.clientY;
        if (!cursorThrottle.current) {
            cursorThrottle.current = setTimeout(() => {
                cursorThrottle.current = null;
                const wx = (clientX - transform.x) / transform.scale;
                const wy = (clientY - transform.y) / transform.scale;
                broadcastCursor?.({ x: wx, y: wy });
            }, 33);
        }
    }, [handlers, transform, broadcastCursor, placementCard]);

    // ── Pointer up: commit marquee selection or deselect ─────────────────
    const handlePointerUp = useCallback((e) => {
        if (placementCard) return;

        handlers.onPointerUp(e);

        if (marqueeRef.current && marquee) {
            const MIN_SIZE = 8;
            if (marquee.w > MIN_SIZE || marquee.h > MIN_SIZE) {
                const p1 = screenToWorld(marqueeRef.current.startX, marqueeRef.current.startY);
                const p2 = screenToWorld(e.clientX, e.clientY);
                const minX = Math.min(p1.x, p2.x);
                const maxX = Math.max(p1.x, p2.x);
                const minY = Math.min(p1.y, p2.y);
                const maxY = Math.max(p1.y, p2.y);

                const ids = objects
                    .filter(o => !o.ownerId)
                    .filter(o => {
                        const cx = o.x + o.width / 2;
                        const cy = o.y + o.height / 2;
                        return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
                    })
                    .map(o => o.id);

                if (ids.length > 0) selectMany(ids);
                else if (!e.shiftKey) deselectAll();
            } else {
                if (!e.shiftKey) deselectAll();
            }
        }

        marqueeRef.current = null;
        setMarquee(null);
    }, [handlers, marquee, objects, screenToWorld, selectMany, deselectAll, placementCard]);

    const otherPlayers = players.filter(p => p.id !== playerId);
    const panning = isPanning();
    const cursor = placementCard
        ? 'crosshair'
        : panning ? 'grabbing' : 'grab';

    // Ghost card dimensions
    const ghostW = placementCard ? (placementCard.width || 80) * transform.scale : 0;
    const ghostH = placementCard ? (placementCard.height || 120) * transform.scale : 0;

    return (
        <div
            id="game-canvas-wrapper"
            className="z-canvas fixed inset-0 overflow-hidden felt-bg"
            style={{
                paddingLeft: sidebarCollapsed ? 0 : (sidebarW ?? 224),
                paddingTop: 48,
                cursor,
                transition: 'padding-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onWheel={handlers.onWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handlers.onKeyDown}
            onKeyUp={handlers.onKeyUp}
            tabIndex={0}
            onContextMenu={(e) => {
                e.preventDefault();
                if (placementCard) onPlacementCancel?.();
            }}
        >
            {/* World transform container */}
            <div
                id="game-world"
                style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                    transformOrigin: '0 0',
                    willChange: 'transform',
                }}
            >
                {showGrid && <GridOverlay scale={transform.scale} />}

                {objects
                    .filter(o => !o.ownerId)
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map(obj => {
                        const props = { key: obj.id, obj, transform, onContextMenu: open };
                        if (obj.type === 'card') return <GameCard  {...props} />;
                        if (obj.type === 'token') return <GameToken {...props} />;
                        if (obj.type === 'tile') return <GameTile  {...props} />;
                        if (obj.type === 'board') return <GameBoard {...props} />;
                        return null;
                    })
                }

                {otherPlayers.map(p =>
                    p.cursor && <PlayerCursor key={p.id} player={p} rotation={transform.rotation} />
                )}
            </div>

            {/* Ghost card — follows cursor during placement mode */}
            {placementCard && (
                <div
                    className="placement-ghost"
                    style={{
                        position: 'fixed',
                        left: ghostPos.x - ghostW / 2,
                        top: ghostPos.y - ghostH / 2,
                        width: ghostW,
                        height: ghostH,
                        pointerEvents: 'none',
                        zIndex: 9000,
                    }}
                >
                    {/* Card visual */}
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            background: (placementCard.startFlipped ? '#1a2f1a' : (placementCard.color || '#fdf6e3')),
                            borderRadius: 6 * transform.scale,
                            border: `${2 * transform.scale}px solid rgba(250,204,21,0.9)`,
                            boxShadow: `0 0 ${16 * transform.scale}px rgba(250,204,21,0.5), 0 8px 24px rgba(0,0,0,0.5)`,
                            opacity: 0.82,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 4,
                        }}
                    >
                        {placementCard.startFlipped ? (
                            <span style={{ fontSize: 24 * transform.scale }}>🎴</span>
                        ) : (
                            <>
                                <span style={{ fontSize: 18 * transform.scale }}>🃏</span>
                                <span style={{
                                    fontSize: Math.max(9, 9 * transform.scale),
                                    color: '#1a4731',
                                    fontWeight: 700,
                                    maxWidth: '90%',
                                    textAlign: 'center',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {placementCard.label || 'Card'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Placement mode banner */}
            {placementCard && (
                <div className="placement-banner">
                    <span>📍</span>
                    <span>Click to place <strong>{placementCard.label || 'card'}</strong> {placementCard.startFlipped ? 'face-down' : 'face-up'}</span>
                    <button onClick={onPlacementCancel}>✕ Cancel</button>
                </div>
            )}

            {/* Marquee selection rectangle */}
            {marquee && (marquee.w > 4 || marquee.h > 4) && (
                <div
                    className="marquee-rect"
                    style={{
                        position: 'fixed',
                        left: marquee.x,
                        top: marquee.y,
                        width: marquee.w,
                        height: marquee.h,
                        pointerEvents: 'none',
                    }}
                />
            )}

            <ContextMenu menu={menu} onClose={close} onViewImage={onViewImage} onPlayCard={onPlayCard} />
        </div>
    );
}
