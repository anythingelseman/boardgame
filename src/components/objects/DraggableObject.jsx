import { useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';

export default function DraggableObject({ obj, transform, onContextMenu, children }) {
    const {
        updateObject, updateManyObjects,
        bringToFront, bringManyToFront,
        selectObject, toggleSelect, selectedIds,
    } = useGameStore();

    const dragRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const isSelected = selectedIds.includes(obj.id);

    const handlePointerDown = (e) => {
        // Right-click: stop propagation so canvas doesn't start panning,
        // then let onContextMenu handle it
        if (e.button === 2) {
            e.stopPropagation();
            return;
        }

        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);

        if (e.shiftKey) {
            toggleSelect(obj.id);
            return;
        }

        const currentObjects = useGameStore.getState().objects;
        let idsToMove;

        if (selectedIds.includes(obj.id) && selectedIds.length > 1) {
            // ── Explicit multi-selection drag ────────────────────
            idsToMove = selectedIds;
            bringManyToFront(idsToMove);

        } else if (obj.deckId) {
            // ── Deck drag: move all cards with same deckId ───────
            // Only cards explicitly grouped via "Stack into Deck" share a deckId
            const deckCards = currentObjects.filter(o => o.deckId === obj.deckId && !o.ownerId);
            idsToMove = deckCards.map(o => o.id);
            bringManyToFront(idsToMove);

        } else {
            // ── Single object ────────────────────────────────────
            idsToMove = [obj.id];
            bringToFront(obj.id);
        }

        if (!selectedIds.includes(obj.id)) {
            selectObject(obj.id);
        }

        const origPositions = {};
        for (const id of idsToMove) {
            const o = currentObjects.find(x => x.id === id);
            if (o) origPositions[id] = { x: o.x, y: o.y };
        }

        setDragging(true);
        dragRef.current = { startX: e.clientX, startY: e.clientY, idsToMove, origPositions };
    };

    const handlePointerMove = (e) => {
        if (!dragging || !dragRef.current) return;
        const dx = (e.clientX - dragRef.current.startX) / transform.scale;
        const dy = (e.clientY - dragRef.current.startY) / transform.scale;

        if (dragRef.current.idsToMove.length > 1) {
            const updates = {};
            for (const [id, orig] of Object.entries(dragRef.current.origPositions)) {
                updates[id] = { x: orig.x + dx, y: orig.y + dy };
            }
            updateManyObjects(updates);
        } else {
            updateObject(obj.id, {
                x: dragRef.current.origPositions[obj.id].x + dx,
                y: dragRef.current.origPositions[obj.id].y + dy,
            });
        }
    };

    const handlePointerUp = (e) => {
        setDragging(false);
        dragRef.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const style = {
        position: 'absolute',
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        transform: `rotate(${obj.rotation}deg)`,
        zIndex: obj.zIndex,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        // Smooth out remote movements, but keep local dragging instant
        transition: dragging ? 'none' : 'left 0.12s linear, top 0.12s linear, transform 0.2s ease-out',
    };

    return (
        <div
            style={style}
            className={isSelected ? 'obj-selected' : ''}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={(e) => onContextMenu(e, obj.id)}
        >
            {children}
        </div>
    );
}
