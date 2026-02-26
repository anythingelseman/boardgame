import { useState } from 'react';
import useGameStore from '../../store/gameStore';
import useRoomStore from '../../store/roomStore';

export default function Toolbar({ transform, zoomIn, zoomOut, resetView, onOpenRoom }) {
    const { mode, setMode, toggleGrid, showGrid, clearBoard } = useGameStore();
    const { roomCode, role, connected, leaveRoom } = useRoomStore();

    const zoomPct = Math.round(transform.scale * 100);

    return (
        <header
            id="toolbar"
            className="toolbar-glass z-toolbar fixed top-0 left-0 right-0 h-12 flex items-center gap-3 px-4"
        >
            {/* Brand */}
            <div className="flex items-center gap-2 mr-2 select-none">
                <span className="text-lg">🎲</span>
                <span className="text-sm font-bold text-green-400 tracking-wide hidden sm:block">BoardSandbox</span>
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Mode toggle */}
            <div className="flex rounded-md overflow-hidden border border-white/10 text-xs">
                <button
                    className={`px-3 py-1 font-semibold transition-colors ${mode === 'play' ? 'bg-green-700 text-white' : 'text-stone-400 hover:bg-white/5'}`}
                    onClick={() => setMode('play')}
                    title="Play Mode"
                >
                    ▶ Play
                </button>
                <button
                    className={`px-3 py-1 font-semibold transition-colors ${mode === 'editor' ? 'bg-amber-700 text-white' : 'text-stone-400 hover:bg-white/5'}`}
                    onClick={() => setMode('editor')}
                    title="Editor Mode"
                >
                    ✏ Editor
                </button>
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Grid toggle */}
            <button
                className={`text-xs px-2 py-1 rounded border transition-colors ${showGrid ? 'border-green-500/40 text-green-400 bg-green-900/30' : 'border-white/10 text-stone-500 hover:text-stone-300'}`}
                onClick={toggleGrid}
                title="Toggle Grid"
            >
                ⊞ Grid
            </button>

            <div className="flex-1" />

            {/* Zoom controls */}
            <div className="flex items-center gap-1">
                <button
                    className="w-6 h-6 rounded text-stone-400 hover:text-white hover:bg-white/10 text-sm transition-colors"
                    onClick={zoomOut}
                    title="Zoom Out"
                >−</button>
                <button
                    className="min-w-[52px] text-center text-xs text-stone-300 font-mono hover:bg-white/5 rounded px-1 py-0.5 transition-colors"
                    onClick={resetView}
                    title="Reset View"
                >
                    {zoomPct}%
                </button>
                <button
                    className="w-6 h-6 rounded text-stone-400 hover:text-white hover:bg-white/10 text-sm transition-colors"
                    onClick={zoomIn}
                    title="Zoom In"
                >+</button>
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Clear board */}
            <button
                className="text-xs px-2 py-1 rounded border border-white/10 text-stone-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
                onClick={() => { if (window.confirm('Clear all objects from the board?')) clearBoard(); }}
                title="Clear Board"
            >
                🗑 Clear
            </button>

            <div className="w-px h-6 bg-white/10" />

            {/* Room button */}
            {connected ? (
                <div className="flex items-center gap-2">
                    <div className="text-xs">
                        <span className="text-stone-500">{role === 'host' ? '👑 ' : '🟢 '}</span>
                        <span className="font-mono text-yellow-400 font-bold tracking-widest">{roomCode}</span>
                    </div>
                    <button
                        className="text-xs px-2 py-1 rounded border border-white/10 text-stone-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
                        onClick={leaveRoom}
                        title="Leave Room"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <button
                    className="text-xs px-3 py-1.5 rounded-md bg-green-700 hover:bg-green-600 text-white font-semibold transition-colors shadow"
                    onClick={onOpenRoom}
                >
                    🔗 Room
                </button>
            )}
        </header>
    );
}
