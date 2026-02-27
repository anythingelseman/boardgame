import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useGameStore from '../../store/gameStore';
import useRoomStore from '../../store/roomStore';

export default function DeckPeekModal() {
    const { objects, peekingDeckId, peekingCount, setPeekingDeck, reorderDeckCards, toHand, _getDeck } = useGameStore();
    const { playerName, playerId } = useRoomStore();
    const [peekCards, setPeekCards] = useState([]);

    useEffect(() => {
        if (!peekingDeckId) {
            setPeekCards([]);
            return;
        }

        const deck = _getDeck(peekingDeckId);
        // Sort by zIndex descending to get Top cards first in our view
        const topN = [...deck]
            .sort((a, b) => b.zIndex - a.zIndex)
            .slice(0, peekingCount);

        setPeekCards(topN);
    }, [peekingDeckId, peekingCount]);

    if (!peekingDeckId) return null;

    const handleTake = (card) => {
        toHand(card.id, playerId, playerName);
        setPeekCards(prev => prev.filter(c => c.id !== card.id));
    };

    const moveCard = (index, direction) => {
        const newCards = [...peekCards];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= newCards.length) return;

        [newCards[index], newCards[newIndex]] = [newCards[newIndex], newCards[index]];
        setPeekCards(newCards);

        // Update the store immediately so others see the change
        // Note: Our list is Top -> Bottom visually, so we reverse it for the store logic
        const orderedIds = [...newCards].reverse().map(c => c.id);
        reorderDeckCards(peekingDeckId, orderedIds, playerName);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-10000 flex items-center justify-center p-8 bg-black/80 backdrop-blur-md"
            onClick={() => setPeekingDeck(null)}
        >
            <div
                className="bg-stone-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-[90vw] overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">🔍</span> Peeking Deck
                        </h2>
                        <p className="text-stone-500 text-sm">Peeking top {peekingCount} cards. Rearrange or take them.</p>
                    </div>

                    <button
                        onClick={() => setPeekingDeck(null)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-stone-400 hover:text-white transition-all text-xl"
                    >✕</button>
                </div>

                {/* Content - Fixed scrolling logic */}
                <div className="flex-1 overflow-x-auto p-12 scrollbar-thin scrollbar-thumb-white/10">
                    {peekCards.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-stone-600 italic">
                            No cards in deck
                        </div>
                    ) : (
                        <div className="flex gap-8 items-center min-w-max px-4">
                            {peekCards.map((card, idx) => (
                                <div key={card.id} className="flex flex-col gap-4 items-center shrink-0">
                                    <div className="text-[10px] font-bold text-stone-600 uppercase tracking-tighter">
                                        {idx === 0 ? 'TOP CARD' : `Slot ${idx + 1}`}
                                    </div>

                                    <div
                                        className="group relative w-56 aspect-[3/4.2] rounded-xl overflow-hidden border-2 border-white/10 bg-stone-800 shadow-xl hover:border-amber-500/50 transition-all cursor-pointer"
                                    >
                                        {card.imageUrl ? (
                                            <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center p-4 text-center">
                                                <span className="text-stone-300 font-bold text-sm">{card.label || 'Card'}</span>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleTake(card); }}
                                                className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-full hover:bg-amber-400 transition-colors shadow-lg"
                                            >
                                                TAKE CARD
                                            </button>
                                        </div>
                                    </div>

                                    {/* Reorder Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            disabled={idx === 0}
                                            onClick={() => moveCard(idx, -1)}
                                            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                        >
                                            ←
                                        </button>
                                        <button
                                            disabled={idx === peekCards.length - 1}
                                            onClick={() => moveCard(idx, 1)}
                                            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex justify-between items-center">
                    <span className="text-stone-500 text-[10px] italic">Deep deck order is preserved. Only the top {peekingCount} are visible.</span>
                    <button
                        onClick={() => setPeekingDeck(null)}
                        className="px-8 py-2.5 bg-stone-100 text-stone-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-widest text-xs"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
