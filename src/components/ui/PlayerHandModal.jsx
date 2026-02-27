import { createPortal } from 'react-dom';
import useGameStore from '../../store/gameStore';
import useRoomStore from '../../store/roomStore';

export default function PlayerHandModal() {
    const { objects, viewingHandPlayerId, setViewingHand, takeCardFromHand } = useGameStore();
    const { players, playerId, playerName } = useRoomStore();

    if (!viewingHandPlayerId) return null;

    const targetPlayer = players.find(p => p.id === viewingHandPlayerId);
    if (!targetPlayer) {
        setViewingHand(null);
        return null;
    }

    const hand = objects.filter(o => o.ownerId === viewingHandPlayerId);

    const handleTake = (card) => {
        takeCardFromHand(card.id, playerId, playerName, targetPlayer.name);
        // We can close or stay open. User said "select 1 card to take", so maybe we stay open in case they want more or close?
        // Let's keep it open for flexibility but maybe provide a visual cue. 
        // Actually usually stealing means taking one and closing. 
    };

    return createPortal(
        <div
            className="fixed inset-0 z-10000 flex items-center justify-center p-4 md:p-8"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setViewingHand(null)}
        >
            <div
                className="bg-stone-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">👁️</span> Viewing {targetPlayer.name}'s Hand
                        </h2>
                        <p className="text-stone-500 text-sm">Select a card to take it for yourself</p>
                    </div>
                    <button
                        onClick={() => setViewingHand(null)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-stone-400 hover:text-white transition-all text-xl"
                    >✕</button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-8">
                    {hand.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-stone-600 italic">
                            This player's hand is empty
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {hand.map(card => (
                                <div
                                    key={card.id}
                                    className="group relative aspect-[3/4.2] rounded-xl overflow-hidden border border-white/10 bg-stone-800 shadow-lg hover:border-amber-500/50 hover:shadow-amber-500/10 transition-all cursor-pointer"
                                    onClick={() => handleTake(card)}
                                >
                                    {card.imageUrl ? (
                                        <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-4 text-center">
                                            <span className="text-stone-300 font-bold">{card.label || 'Card'}</span>
                                        </div>
                                    )}

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity p-4">
                                        <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                            ✋
                                        </div>
                                        <span className="mt-4 text-white font-bold text-sm tracking-widest uppercase">Take Card</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-black/40 border-t border-white/10 text-right">
                    <span className="text-stone-500 text-xs italic">All thefts are announced in the activity log. Play fair! 🎲</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
