import { useState } from 'react';
import useGameStore from '../../store/gameStore';

const BACKGROUNDS = [
    { id: 'felt-green', label: '🟢 Green Felt', color: '#1a4731' },
    { id: 'felt-blue', label: '🔵 Blue Felt', color: '#1a2f47' },
    { id: 'felt-red', label: '🔴 Red Felt', color: '#4a1a1a' },
    { id: 'felt-dark', label: '⬛ Dark', color: '#111' },
];

export default function EditorPanel() {
    const { objects, selectedIds, updateObject, background, setBackground } = useGameStore();
    // Show properties when exactly one object is selected
    const selected = selectedIds.length === 1 ? objects.find(o => o.id === selectedIds[0]) : null;


    return (
        <div
            className="z-sidebar fixed right-0 top-12 bottom-0 w-56 flex flex-col gap-0 overflow-y-auto"
            style={{ background: 'rgba(8,22,14,0.94)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        >
            {/* Editor header */}
            <div className="px-3 pt-3 pb-2 border-b border-white/10">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                    <span>✏</span> Editor Mode
                </div>
                <p className="text-[10px] text-stone-600 mt-1">Right-click objects to edit. Select for properties.</p>
            </div>

            {/* Selected object properties */}
            {selected ? (
                <div className="px-3 py-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">
                        {selected.type} Properties
                    </div>

                    {/* Label */}
                    <div className="mb-3">
                        <label className="text-[10px] text-stone-600 block mb-1">Label</label>
                        <input
                            className="w-full bg-stone-800 border border-white/10 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                            value={selected.label || ''}
                            onChange={e => updateObject(selected.id, { label: e.target.value })}
                            placeholder="Object label"
                        />
                    </div>

                    {/* Color */}
                    <div className="mb-3">
                        <label className="text-[10px] text-stone-600 block mb-1">Color</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10"
                                value={selected.color || '#ffffff'}
                                onChange={e => updateObject(selected.id, { color: e.target.value })}
                            />
                            <span className="text-xs text-stone-500 font-mono">{selected.color || '-'}</span>
                        </div>
                    </div>

                    {/* Size */}
                    <div className="mb-3 grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-stone-600 block mb-1">Width</label>
                            <input
                                type="number"
                                min={20} max={400}
                                className="w-full bg-stone-800 border border-white/10 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
                                value={selected.width || 80}
                                onChange={e => updateObject(selected.id, { width: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-stone-600 block mb-1">Height</label>
                            <input
                                type="number"
                                min={20} max={400}
                                className="w-full bg-stone-800 border border-white/10 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
                                value={selected.height || 80}
                                onChange={e => updateObject(selected.id, { height: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Image URL */}
                    <div className="mb-3">
                        <label className="text-[10px] text-stone-600 block mb-1">Image URL</label>
                        <input
                            className="w-full bg-stone-800 border border-white/10 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                            value={selected.imageUrl || ''}
                            onChange={e => updateObject(selected.id, { imageUrl: e.target.value || null })}
                            placeholder="https://..."
                        />
                    </div>

                    {/* Position readout */}
                    <div className="bg-stone-800/50 rounded p-2 text-[10px] text-stone-600 font-mono">
                        x: {Math.round(selected.x)} · y: {Math.round(selected.y)}
                        <br />
                        rot: {selected.rotation}° · z: {selected.zIndex}
                    </div>
                </div>
            ) : (
                <div className="px-3 py-4 text-center">
                    {selectedIds.length > 1 ? (
                        <div className="text-amber-600/70 text-xs">
                            {selectedIds.length} objects selected —<br />select just one to edit properties
                        </div>
                    ) : (
                        <div className="text-stone-600 text-xs">Select an object to edit its properties</div>
                    )}
                </div>
            )}


            <div className="mx-3 border-t border-white/10 my-1" />

            {/* Background picker */}
            <div className="px-3 py-3">
                <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Table Background</div>
                <div className="flex flex-col gap-1">
                    {BACKGROUNDS.map(bg => (
                        <button
                            key={bg.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${background === bg.id ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'}`}
                            onClick={() => setBackground(bg.id)}
                        >
                            <span className="w-4 h-4 rounded-sm border border-white/20 flex-shrink-0" style={{ background: bg.color }} />
                            {bg.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1" />
        </div>
    );
}
