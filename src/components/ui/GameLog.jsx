import { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';

export default function GameLog() {
    const logs = useGameStore(state => state.logs);
    const scrollRef = useRef(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Auto-scroll to bottom when logs update
    useEffect(() => {
        if (!isCollapsed && scrollRef.current) {
            scrollRef.current.scrollTop = 0; // Since we prepend logs, scroll to top
        }
    }, [logs, isCollapsed]);

    return (
        <div className={`fixed top-16 right-4 z-40 transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-64 h-48'}`}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -bottom-3 -left-3 w-6 h-6 bg-stone-800 border border-white/10 rounded-full flex items-center justify-center text-[10px] text-stone-400 hover:text-white shadow-xl z-50 transition-colors"
            >
                {isCollapsed ? '🪵' : '✕'}
            </button>

            <div className={`w-full h-full bg-stone-900/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-opacity ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {/* Header */}
                <div className="px-3 py-1.5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Activity Log</span>
                    <span className="text-[10px] text-stone-600 italic">Last 50 actions</span>
                </div>

                {/* Log List */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide select-none"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-stone-700 italic">
                            No activity yet...
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-2 items-start animate-in fade-in slide-in-from-right-2 duration-300">
                                <span className="text-[8px] text-stone-600 font-mono mt-0.5 whitespace-nowrap">
                                    {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className="text-[11px] text-stone-300 leading-tight">
                                    {parseLogText(log.text)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Minimized Icon */}
            {isCollapsed && (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="w-full h-full bg-stone-900 border border-white/10 rounded-xl flex items-center justify-center text-lg shadow-2xl hover:bg-stone-800 transition-colors"
                >
                    🪵
                </button>
            )}
        </div>
    );
}

// Simple highlighter for names and keywords
function parseLogText(text) {
    const parts = text.split(/(\[.*?\]|'.*?'|".*?")/g);
    return parts.map((part, i) => {
        if ((part.startsWith('[') && part.endsWith(']')) ||
            (part.startsWith("'") && part.endsWith("'")) ||
            (part.startsWith('"') && part.endsWith('"'))) {
            return <span key={i} className="text-amber-500 font-semibold">{part}</span>;
        }
        return part;
    });
}
