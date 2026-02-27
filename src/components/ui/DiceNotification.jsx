import { useEffect, useState } from 'react';
import useGameStore from '../../store/gameStore';

/**
 * A popup notification that appears whenever someone rolls the dice.
 * Shows the player name and the dice results with icons.
 */
export default function DiceNotification() {
    const lastRollInfo = useGameStore(state => state.lastRollInfo);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!lastRollInfo) return;

        // Show notification
        setVisible(true);

        // Hide after 5 seconds
        const timer = setTimeout(() => setVisible(false), 5000);
        return () => clearTimeout(timer);
    }, [lastRollInfo]);

    if (!visible || !lastRollInfo) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-1000 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-stone-900/95 backdrop-blur-xl border-2 border-amber-500/50 rounded-2xl px-8 py-4 shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-3">
                <span className="text-amber-400 font-black text-xs uppercase tracking-[0.2em]">
                    {lastRollInfo.name} rolled
                </span>
                <div className="flex gap-3">
                    {lastRollInfo.results.map((val, i) => (
                        <div key={i} className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center text-2xl text-stone-900 font-black border-b-4 border-stone-300 transform -rotate-3 last:rotate-3">
                            {val}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
