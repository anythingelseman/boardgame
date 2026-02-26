import DraggableObject from './DraggableObject';
import HqImage from './HqImage';
import useRoomStore from '../../store/roomStore';

export default function GameTile({ obj, transform, onContextMenu }) {
    const { playerId } = useRoomStore();
    const isInOtherHand = obj.ownerId && obj.ownerId !== playerId;
    if (isInOtherHand) return null;

    return (
        <DraggableObject obj={obj} transform={transform} onContextMenu={onContextMenu}>
            <div className="w-full h-full rounded border-2 border-white/20 shadow-lg relative overflow-hidden"
                style={{ background: obj.color || '#78716c' }}>
                {/* Grid texture */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 15px,rgba(0,0,0,0.2) 15px,rgba(0,0,0,0.2) 16px),repeating-linear-gradient(90deg,transparent,transparent 15px,rgba(0,0,0,0.2) 15px,rgba(0,0,0,0.2) 16px)',
                }} />
                {obj.imageUrl ? (
                    <HqImage src={obj.imageUrl} alt={obj.label} scale={transform.scale} />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <span className="text-lg">⬛</span>
                        <span className="text-white/80 text-[9px] font-semibold text-center px-1 truncate max-w-full">{obj.label}</span>
                    </div>
                )}
            </div>
        </DraggableObject>
    );
}
