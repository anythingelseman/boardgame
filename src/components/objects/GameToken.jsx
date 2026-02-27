import DraggableObject from './DraggableObject';
import HqImage from './HqImage';
import useRoomStore from '../../store/roomStore';

export default function GameToken({ obj, transform, onContextMenu }) {
    const { playerId } = useRoomStore();
    const isInOtherHand = obj.ownerId && obj.ownerId !== playerId;
    if (isInOtherHand) return null;

    return (
        <DraggableObject obj={obj} transform={transform} onContextMenu={onContextMenu}>
            <div className="w-full h-full rounded-full border-4 border-white/40 shadow-xl flex items-center justify-center relative overflow-hidden"
                style={{ background: obj.color || '#ef4444' }}>
                {/* Shine */}
                <div className="absolute top-1 left-1 w-1/3 h-1/3 rounded-full bg-white/30 blur-[2px]" />
                {obj.imageUrl ? (
                    <HqImage
                        src={obj.imageUrl}
                        alt={obj.label}
                        scale={transform.scale}
                        style={{ objectFit: 'cover', borderRadius: '50%' }}
                    />
                ) : (
                    <span className="text-white font-bold select-none drop-shadow z-10"
                        style={{ fontSize: Math.max(8, obj.width * 0.22) }}>
                        {obj.label?.[0] || '●'}
                    </span>
                )}
            </div>
        </DraggableObject>
    );
}
