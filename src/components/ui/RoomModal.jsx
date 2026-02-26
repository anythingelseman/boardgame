import { useState } from 'react';
import useRoomStore from '../../store/roomStore';

export default function RoomModal({ onClose }) {
    const { createRoom, joinRoom } = useRoomStore();
    const [tab, setTab] = useState('create'); // 'create' | 'join'
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [created, setCreated] = useState(null);

    const handleCreate = () => {
        const roomCode = createRoom(name || 'Host');
        setCreated(roomCode);
    };

    const handleJoin = () => {
        if (code.trim().length < 4) return;
        joinRoom(code.trim(), name || 'Player');
        onClose();
    };

    return (
        <div
            className="modal-backdrop z-modal fixed inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="modal-box relative bg-stone-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">Multiplayer Room</h2>
                    <p className="text-stone-500 text-sm mt-0.5">Create or join a board game session</p>
                </div>

                {/* Tab switcher */}
                <div className="flex border-b border-white/10">
                    <button
                        className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'create' ? 'text-green-400 border-b-2 border-green-500' : 'text-stone-500 hover:text-stone-300'}`}
                        onClick={() => { setTab('create'); setCreated(null); }}
                    >
                        Create Room
                    </button>
                    <button
                        className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'join' ? 'text-green-400 border-b-2 border-green-500' : 'text-stone-500 hover:text-stone-300'}`}
                        onClick={() => { setTab('join'); setCreated(null); }}
                    >
                        Join Room
                    </button>
                </div>

                <div className="p-6">
                    {/* Player name */}
                    <div className="mb-4">
                        <label className="text-xs text-stone-500 font-semibold uppercase tracking-wider block mb-1">
                            Your Name
                        </label>
                        <input
                            className="w-full bg-stone-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-green-500/50 transition-colors"
                            placeholder={tab === 'create' ? 'Host' : 'Player'}
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    {tab === 'create' ? (
                        <>
                            {created ? (
                                <div className="text-center py-4">
                                    <div className="text-stone-500 text-sm mb-2">Room created! Share this code:</div>
                                    <div className="font-mono text-4xl font-black text-yellow-400 tracking-widest mb-4 select-all">{created}</div>
                                    <p className="text-xs text-stone-600 mb-4">Open another browser tab and Join with this code to test multiplayer.</p>
                                    <button
                                        className="w-full py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold text-sm transition-colors"
                                        onClick={onClose}
                                    >
                                        Start Playing →
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="w-full py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold text-sm transition-colors"
                                    onClick={handleCreate}
                                >
                                    🎲 Create Room
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="mb-4">
                                <label className="text-xs text-stone-500 font-semibold uppercase tracking-wider block mb-1">
                                    Room Code
                                </label>
                                <input
                                    className="w-full bg-stone-800 border border-white/10 rounded-lg px-3 py-2 text-lg font-mono font-bold text-yellow-400 tracking-widest placeholder-stone-700 focus:outline-none focus:border-green-500/50 uppercase transition-colors"
                                    placeholder="ABC123"
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
                                    maxLength={6}
                                />
                            </div>
                            <button
                                className="w-full py-2.5 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
                                onClick={handleJoin}
                                disabled={code.length < 4}
                            >
                                🔗 Join Room
                            </button>
                        </>
                    )}
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
