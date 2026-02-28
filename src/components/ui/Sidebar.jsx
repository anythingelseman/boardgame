import { useState } from 'react';
import useGameStore from '../../store/gameStore';
import useRoomStore from '../../store/roomStore';

const SPAWN_TYPES = [
    { type: 'card', label: 'Card', icon: '🃏', desc: '80×120px' },
    { type: 'token', label: 'Token', icon: '⚫', desc: '56×56px' },
    { type: 'tile', label: 'Tile', icon: '⬛', desc: '96×96px' },
];
const EDITOR_SPAWN_TYPES = [
    { type: 'board', label: 'Board/Mat', icon: '🗺', desc: '600×400px — big image' },
];

const TOKEN_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];

const SIDEBAR_W = 224; // px — matches w-56

export default function Sidebar({ screenToWorld, transform, onSaveLoad, collapsed, onToggle, onRotate, onReset, sendPermissionReq }) {
    const {
        spawnObject, objects, mode, setMode, toggleGrid, showGrid,
        selectedIds, deselectAll, setViewingHand, stealRandomCard,
        setWaitingForPermission
    } = useGameStore();
    const { roomCode, role, players, playerId, playerName } = useRoomStore();
    const [tokenColor, setTokenColor] = useState('#ef4444');
    const [customLabel, setCustomLabel] = useState('');

    const ALL_TYPES = [...SPAWN_TYPES, ...EDITOR_SPAWN_TYPES];

    const handleSpawn = (type) => {
        const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
        const offset = { x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60 };
        const typeLabel = ALL_TYPES.find(s => s.type === type)?.label || type;
        spawnObject(type, {
            x: center.x + offset.x,
            y: center.y + offset.y,
            label: customLabel || typeLabel,
            color: type === 'token' ? tokenColor : undefined,
        });
    };

    const counts = {
        card: objects.filter(o => o.type === 'card').length,
        token: objects.filter(o => o.type === 'token').length,
        tile: objects.filter(o => o.type === 'tile').length,
        board: objects.filter(o => o.type === 'board').length,
    };

    const handleRequestPermission = (targetId, type, targetName) => {
        const requestId = sendPermissionReq(targetId, type, targetName);
        setWaitingForPermission({ toName: targetName, type, requestId });
    };

    return (
        <>
            {/* ── Sidebar panel ── */}
            <aside
                className="z-sidebar fixed left-0 top-12 bottom-0 flex flex-col gap-0 overflow-y-auto"
                style={{
                    width: SIDEBAR_W,
                    background: 'rgba(8,22,14,0.92)',
                    borderRight: '1px solid rgba(255,255,255,0.07)',
                    transform: collapsed ? `translateX(-${SIDEBAR_W}px)` : 'translateX(0)',
                    transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'transform',
                }}
            >
                {/* ── Component Library ── */}
                <div className="px-3 pt-3 pb-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Component Library</div>

                    {/* Selection count */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1 mb-2">
                            <span className="text-xs text-yellow-400">{selectedIds.length} selected</span>
                            <button className="text-[10px] text-yellow-600 hover:text-yellow-400" onClick={deselectAll}>✕ clear</button>
                        </div>
                    )}

                    {mode === 'editor' && (
                        <>
                            {/* Custom label input */}
                            <input
                                className="w-full bg-stone-800 border border-white/10 rounded px-2 py-1 text-xs text-stone-300 placeholder-stone-600 mb-2 focus:outline-none focus:border-green-500/50"
                                placeholder="Custom label (optional)"
                                value={customLabel}
                                onChange={e => setCustomLabel(e.target.value)}
                            />

                            {/* Token color picker */}
                            <div className="mb-3">
                                <div className="text-[10px] text-stone-600 mb-1">Token color</div>
                                <div className="flex flex-wrap gap-1">
                                    {TOKEN_COLORS.map(c => (
                                        <button key={c} onClick={() => setTokenColor(c)}
                                            className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                                            style={{ background: c, borderColor: tokenColor === c ? 'white' : 'transparent' }} />
                                    ))}
                                </div>
                            </div>

                            {/* Spawn buttons */}
                            <div className="flex flex-col gap-2">
                                {SPAWN_TYPES.map(({ type, label, icon, desc }) => (
                                    <button
                                        key={type}
                                        className="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 text-left group"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}
                                        onClick={() => handleSpawn(type)}
                                    >
                                        <span className="text-xl">{icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-stone-200">{label}</div>
                                            <div className="text-[10px] text-stone-500">{desc}</div>
                                        </div>
                                        <span className="ml-auto bg-stone-700 text-stone-400 text-[10px] rounded px-1 font-mono">
                                            {counts[type]}
                                        </span>
                                    </button>
                                ))}

                                {/* Editor-only: Board / Mat spawn */}
                                {EDITOR_SPAWN_TYPES.map(({ type, label, icon, desc }) => (
                                    <button
                                        key={type}
                                        className="sidebar-item w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-amber-500/20 text-left"
                                        style={{ background: 'rgba(251,191,36,0.06)' }}
                                        onClick={() => handleSpawn(type)}
                                    >
                                        <span className="text-lg">{icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-amber-300">{label}</div>
                                            <div className="text-[10px] text-stone-600">{desc}</div>
                                        </div>
                                        <span className="ml-auto bg-stone-700 text-stone-400 text-[10px] rounded px-1 font-mono">
                                            {counts[type] ?? 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="mx-3 border-t border-white/10 my-1" />

                {/* ── Dice Roller ── */}
                <div className="px-3 py-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Dice Roller</div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between bg-black/20 rounded-lg p-1 border border-white/5">
                            {[1, 2, 3, 4].map(num => {
                                const activeCount = useGameStore(state => state.diceCount);
                                return (
                                    <button
                                        key={num}
                                        onClick={() => useGameStore.getState().setDiceCount(num)}
                                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${activeCount === num ? 'bg-amber-600 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                                    >
                                        {num}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => useGameStore.getState().rollDice(useRoomStore.getState().playerName)}
                            className="w-full py-2 bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-bold text-sm shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <span>🎲</span> Roll
                        </button>

                        <div className="flex flex-wrap justify-center gap-2 mt-1 min-h-[32px]">
                            {useGameStore(state => state.diceResults).map((val, i) => (
                                <div key={i} className="w-8 h-8 rounded bg-white text-stone-900 flex items-center justify-center text-sm font-black shadow-md border-b-2 border-stone-300">
                                    {val}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mx-3 border-t border-white/10 my-1" />

                {/* ── Table Controls ── */}
                <div className="px-3 py-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Table</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onRotate}
                            className="py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-bold text-[10px] uppercase tracking-wider border border-white/5 flex flex-col items-center gap-1 transition-colors"
                        >
                            <span className="text-sm">🔄</span>
                            Rotate 90°
                        </button>
                        <button
                            onClick={onReset}
                            className="py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-bold text-[10px] uppercase tracking-wider border border-white/5 flex flex-col items-center gap-1 transition-colors"
                        >
                            <span className="text-sm">🏠</span>
                            Reset View
                        </button>
                    </div>
                </div>

                {/* ── Room & Players info ── */}
                {roomCode && (
                    <>
                        <div className="mx-3 border-t border-white/10 my-1" />
                        <div className="px-3 py-2">
                            <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Room: {roomCode}</div>

                            <div className="flex flex-col gap-1.5 mt-2">
                                {players.map(p => {
                                    const pHandCount = objects.filter(o => o.ownerId === p.id).length;
                                    return (
                                        <div key={p.id} className="flex items-center justify-between bg-white/5 rounded px-2 py-1.5 border border-white/5">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ background: p.color || '#f59e0b', boxShadow: `0 0 4px ${p.color || '#f59e0b'}` }}
                                                />
                                                <span className="text-xs text-stone-200 truncate font-medium">
                                                    {p.name} {p.id === playerId && '(You)'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {p.id !== playerId && pHandCount > 0 && (
                                                    <div className="flex gap-0.5">
                                                        <button
                                                            onClick={() => handleRequestPermission(p.id, 'VIEW_HAND', p.name)}
                                                            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                                                            title="View Hand"
                                                        >
                                                            <span className="text-[10px]">👁️</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRequestPermission(p.id, 'STEAL_RANDOM', p.name)}
                                                            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                                                            title="Steal Random"
                                                        >
                                                            <span className="text-[10px]">🎰</span>
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-black/30 rounded text-stone-400">
                                                    <span className="text-[10px]">✋</span>
                                                    <span className="text-[10px] font-bold font-mono">{pHandCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                <div className="flex-1" />

                {/* ── Editor Save/Load ── */}
                {mode === 'editor' && (
                    <>
                        <div className="mx-3 border-t border-white/10 my-1" />
                        <div className="px-3 py-2 pb-3">
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-amber-400 hover:bg-amber-900/30 border border-amber-500/20 transition-colors"
                                onClick={onSaveLoad}
                            >
                                <span>💾</span> Save / Load Board
                            </button>
                        </div>
                    </>
                )}
            </aside>

            {/* ── Collapse toggle tab ── */}
            <button
                onClick={onToggle}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="sidebar-toggle-tab"
                style={{
                    left: collapsed ? 0 : SIDEBAR_W,
                }}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <span className="sidebar-toggle-arrow" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                    ‹
                </span>
            </button>
        </>
    );
}
