import { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { saveBoard, getSavedBoards, deleteSavedBoard, serializeBoard, deserializeBoard } from '../../utils/boardUtils';

export default function BoardSaveLoad({ onClose }) {
    const { objects, background, loadBoard } = useGameStore();
    const [boardName, setBoardName] = useState('');
    const [saved, setSaved] = useState(getSavedBoards());
    const [status, setStatus] = useState('');

    const refresh = () => setSaved(getSavedBoards());

    const handleSave = () => {
        const name = boardName.trim() || 'Untitled Board';
        saveBoard(name, objects, { background });
        setStatus(`✅ Saved "${name}"`);
        refresh();
        setBoardName('');
        setTimeout(() => setStatus(''), 2000);
    };

    const handleLoad = (board) => {
        loadBoard(board.objects);
        setStatus(`✅ Loaded "${board.name}"`);
        setTimeout(() => { setStatus(''); onClose(); }, 800);
    };

    const handleDelete = (name, e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete "${name}"?`)) return;
        deleteSavedBoard(name);
        refresh();
    };

    const handleExport = () => {
        const json = serializeBoard(objects, { background, name: boardName || 'board' });
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${boardName || 'board'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = deserializeBoard(ev.target.result);
            if (data) {
                loadBoard(data.objects);
                setStatus(`✅ Imported "${data.name}"`);
                setTimeout(() => { setStatus(''); onClose(); }, 800);
            } else {
                setStatus('❌ Invalid board file');
                setTimeout(() => setStatus(''), 2000);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div
            className="modal-backdrop z-modal fixed inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="modal-box relative bg-stone-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-lg font-bold text-white">Save / Load Board</h2>
                    <p className="text-stone-500 text-sm mt-0.5">Manage your board layouts</p>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    {/* Save section */}
                    <div className="mb-6">
                        <div className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">Save Current Board</div>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-stone-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/50"
                                placeholder="Board name..."
                                value={boardName}
                                onChange={e => setBoardName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                            />
                            <button
                                className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                                onClick={handleSave}
                            >
                                💾 Save
                            </button>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                className="flex-1 py-1.5 text-xs rounded border border-white/10 text-stone-500 hover:text-stone-300 hover:border-white/20 transition-colors"
                                onClick={handleExport}
                            >
                                ⬇ Export .json
                            </button>
                            <label className="flex-1 py-1.5 text-xs rounded border border-white/10 text-stone-500 hover:text-stone-300 hover:border-white/20 transition-colors text-center cursor-pointer">
                                ⬆ Import .json
                                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                            </label>
                        </div>
                        {status && <div className="text-xs mt-2 text-green-400">{status}</div>}
                    </div>

                    {/* Saved boards list */}
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                            Saved Boards ({saved.length})
                        </div>
                        {saved.length === 0 ? (
                            <div className="text-stone-700 text-xs text-center py-6">No saved boards yet</div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {saved.map(board => (
                                    <div
                                        key={board.name}
                                        className="flex items-center gap-2 bg-stone-800/60 hover:bg-stone-800 rounded-lg px-3 py-2.5 cursor-pointer group transition-colors"
                                        onClick={() => handleLoad(board)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-stone-200 truncate">{board.name}</div>
                                            <div className="text-[10px] text-stone-600">
                                                {board.objects?.length || 0} objects · {new Date(board.saved).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            className="text-stone-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all px-1"
                                            onClick={(e) => handleDelete(board.name, e)}
                                            title="Delete"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Close button */}
                <button
                    className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-stone-500 hover:text-white flex items-center justify-center text-sm transition-colors"
                    onClick={onClose}
                >✕</button>
            </div>
        </div>
    );
}
