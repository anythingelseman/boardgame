import { useEffect, useState } from 'react';
import useGameStore from '../../store/gameStore';

/**
 * A popup notification that appears whenever someone shuffles a deck.
 */
export default function ShuffleNotification() {
    const lastShuffleInfo = useGameStore(state => state.lastShuffleInfo);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!lastShuffleInfo) return;

        // Show notification
        setVisible(true);

        // Hide after 4 seconds
        const timer = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(timer);
    }, [lastShuffleInfo]);

    if (!visible || !lastShuffleInfo) return null;

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-1000 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-stone-900/95 backdrop-blur-xl border-2 border-green-500/50 rounded-2xl px-10 py-5 shadow-[0_0_50px_rgba(0,0,0,0.7)] flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-3xl animate-bounce">🔀</span>
                    <div className="flex flex-col">
                        <span className="text-green-400 font-black text-[10px] uppercase tracking-[0.2em]">
                            Deck Shuffled
                        </span>
                        <span className="text-white font-bold text-lg">
                            {lastShuffleInfo.name}
                        </span>
                    </div>
                </div>
                <div className="text-stone-500 text-[10px] font-medium italic">
                    {lastShuffleInfo.count} cards randomized
                </div>
            </div>
        </div>
    );
}
