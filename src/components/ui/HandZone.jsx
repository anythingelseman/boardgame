import { useState } from 'react';
import useGameStore from '../../store/gameStore';
import useRoomStore from '../../store/roomStore';
import GameCard from '../objects/GameCard';
import GameToken from '../objects/GameToken';
import GameTile from '../objects/GameTile';
import useContextMenu from '../../hooks/useContextMenu';
import ContextMenu from './ContextMenu';

const IDENTITY_TRANSFORM = { scale: 1 };
const MOCK_CTX = (e) => e.preventDefault();

const handTransform = { scale: 1 };

export default function HandZone({ onViewImage, onPlayCard }) {

    const [collapsed, setCollapsed] = useState(false);
    const { objects, updateObject } = useGameStore();
    const { playerId } = useRoomStore();
    const { menu, open, close } = useContextMenu();

    const handObjects = objects.filter(o => o.ownerId === playerId);

    // Temporarily override position for display within the hand strip
    const returnToBoard = (id) => updateObject(id, { ownerId: null });

    return (
        <>
            <div className={`hand-zone z-hand fixed bottom-0 left-1/2 -translate-x-1/2 ${collapsed ? 'collapsed' : ''}`}
                style={{ width: 'min(900px, 90vw)' }}>
                {/* Header bar */}
                <div
                    className="flex items-center justify-between px-4 h-9 rounded-t-xl cursor-pointer select-none"
                    style={{ background: 'rgba(10,30,20,0.92)', borderTop: '1px solid rgba(255,255,255,0.12)' }}
                    onClick={() => setCollapsed(c => !c)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-400">✋</span>
                        <span className="text-sm font-semibold text-stone-300">My Hand</span>
                        {handObjects.length > 0 && (
                            <span className="bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {handObjects.length}
                            </span>
                        )}
                    </div>
                    <span className="text-stone-500 text-xs">{collapsed ? '▲' : '▼'}</span>
                </div>

                {/* Hand card strip */}
                <div
                    className="relative flex items-end gap-2 px-4 pb-3 pt-2 overflow-x-auto min-h-[120px]"
                    style={{ background: 'rgba(8,22,14,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                    {handObjects.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-stone-600 text-sm py-4">
                            No cards in hand
                        </div>
                    )}
                    {handObjects.map(obj => {
                        // Scale down massive high-res cards for the hand interface
                        const HAND_SCALE = 0.3;
                        const inlineObj = { ...obj, x: 0, y: 0, zIndex: 1, ownerId: playerId };
                        const scaledTransform = { scale: HAND_SCALE };

                        return (
                            <div key={obj.id} className="relative flex-shrink-0 group"
                                style={{ width: obj.width * HAND_SCALE, height: obj.height * HAND_SCALE }}>
                                {obj.type === 'card' && <GameCard obj={inlineObj} transform={scaledTransform} onContextMenu={(e) => open(e, obj.id)} />}
                                {obj.type === 'token' && <GameToken obj={inlineObj} transform={scaledTransform} onContextMenu={(e) => open(e, obj.id)} />}
                                {obj.type === 'tile' && <GameTile obj={inlineObj} transform={scaledTransform} onContextMenu={(e) => open(e, obj.id)} />}
                                <button
                                    className="absolute -top-2 -right-2 bg-stone-700 hover:bg-stone-500 text-white rounded-full w-5 h-5 text-xs hidden group-hover:flex items-center justify-center shadow transition-colors z-30"
                                    onClick={() => returnToBoard(obj.id)}
                                    title="Return to board"
                                >↑</button>
                            </div>
                        );
                    })}
                </div>
            </div>
            <ContextMenu menu={menu} onClose={close} onViewImage={onViewImage} onPlayCard={onPlayCard} />

        </>
    );
}
