import DraggableObject from './DraggableObject';
import HqImage from './HqImage';
import useRoomStore from '../../store/roomStore';

const CARD_BACK_PATTERN = `repeating-linear-gradient(
  45deg,
  #1a4731 0px, #1a4731 4px,
  #15573a 4px, #15573a 8px
)`;

export default function GameCard({ obj, transform, onContextMenu }) {
    const { playerId } = useRoomStore();
    const isInMyHand = obj.ownerId === playerId;
    const isInOtherHand = obj.ownerId && obj.ownerId !== playerId;

    if (isInOtherHand) return null;

    return (
        <DraggableObject obj={obj} transform={transform} onContextMenu={onContextMenu}>
            <div className="card-wrapper w-full h-full">
                <div className={`card-inner ${obj.flipped ? 'flipped' : ''}`}>
                    {/* Card Front */}
                    <div className="card-face flex flex-col items-center justify-between p-1.5 border-2 border-white/30 shadow-xl relative overflow-hidden"
                        style={{ background: obj.color || '#fdf6e3' }}>

                        {/* Content Layer */}
                        {obj.imageUrl ? (
                            /* Pure Image Mode */
                            <HqImage src={obj.imageUrl} alt={obj.label} scale={transform.scale} style={{ objectFit: 'cover' }} />
                        ) : (
                            /* Standard Card Mode */
                            <div className="relative z-10 w-full h-full flex flex-col items-center justify-between pointer-events-none p-1.5">
                                <div className="w-full text-center text-[9px] font-bold text-stone-700 truncate">
                                    {obj.label}
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-2xl">🃏</span>
                                </div>
                                <div className="w-full text-center text-[9px] font-bold text-stone-700 truncate rotate-180">
                                    {obj.label}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Card Back */}
                    <div className="card-back border-2 border-white/20 shadow-xl"
                        style={{ background: CARD_BACK_PATTERN }}>
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center">
                                <span className="text-white/40 text-xs">★</span>
                            </div>
                        </div>
                    </div>
                </div>
                {isInMyHand && (
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-xs text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">H</div>
                )}
            </div>
        </DraggableObject>
    );
}
