import DraggableObject from './DraggableObject';
import HqImage from './HqImage';

export default function GameBoard({ obj, transform, onContextMenu }) {
    return (
        <DraggableObject obj={obj} transform={transform} onContextMenu={onContextMenu}>
            <div className="w-full h-full rounded-lg border-2 border-white/10 shadow-2xl overflow-hidden relative"
                style={{ background: obj.color || '#2c5f2e' }}>
                {obj.imageUrl ? (
                    <HqImage src={obj.imageUrl} alt={obj.label} scale={transform.scale} />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
                        <span className="text-4xl">🗺</span>
                        <span className="text-white text-sm font-semibold">{obj.label}</span>
                        <span className="text-white/60 text-xs">Add an image URL in the Editor panel</span>
                    </div>
                )}
            </div>
        </DraggableObject>
    );
}
