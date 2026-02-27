import DraggableObject from './DraggableObject';
import HqImage from './HqImage';

export default function GameBoard({ obj, transform, onContextMenu }) {
    return (
        <DraggableObject obj={obj} transform={transform} onContextMenu={onContextMenu}>
            <div className="w-full h-full rounded-lg border-2 border-white/10 shadow-2xl overflow-hidden relative"
                style={{ background: obj.color || '#ffffff' }}>
                {obj.imageUrl ? (
                    <HqImage src={obj.imageUrl} alt={obj.label} scale={transform.scale} />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none">
                        <div
                            className="font-black text-center wrap-break-word select-none leading-none"
                            style={{
                                color: obj.textColor || '#000000',
                                fontSize: `${Math.min(obj.width, obj.height) * 0.3}px`,
                                opacity: 0.9
                            }}
                        >
                            {obj.label}
                        </div>
                    </div>
                )}
            </div>
        </DraggableObject>
    );
}
