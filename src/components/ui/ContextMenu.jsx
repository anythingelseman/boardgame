import { createPortal } from 'react-dom';
import useGameStore from '../../store/gameStore';
import useRoomStore from '../../store/roomStore';

const SEP = 'SEP';

export default function ContextMenu({ menu, onClose, onViewImage, onPlayCard }) {
    const {
        objects, selectedIds, updateObject, removeObject, bringManyToFront,
        shuffleDeck, drawTopCard, drawBottomCard, createDeck, takeTopCard, flipDeck, duplicateObjects, addLog, toHand,
        setPeekingDeck
    } = useGameStore();
    const { playerId, playerName } = useRoomStore();

    if (!menu) return null;
    const obj = objects.find(o => o.id === menu.objectId);
    if (!obj) return null;

    const action = (fn) => (e) => { e.stopPropagation(); fn(); onClose(); };

    const isInHand = obj.ownerId === playerId;
    const isDeck = !!obj.deckId;

    // Use current selection if the right-clicked object is part of it, otherwise just the object itself
    const targetIds = selectedIds.includes(obj.id) ? selectedIds : [obj.id];

    const rotate = () => {
        targetIds.forEach(id => {
            const o = objects.find(x => x.id === id);
            if (o) updateObject(id, { rotation: (o.rotation + 90) % 360 });
        });
    };
    const flip = () => {
        targetIds.forEach(id => {
            const o = objects.find(x => x.id === id);
            if (o && !o.deckId) updateObject(id, { flipped: !o.flipped });
        });
    };
    const toHandMany = () => toHand(targetIds, playerId, playerName);
    const fromHandMany = () => targetIds.forEach(id => updateObject(id, { ownerId: null }));

    // Play card: enter placement mode so user can pick a spot on the canvas
    const playCard = (flipped = false) => onPlayCard?.(obj, flipped);

    const del = () => {
        addLog(`${playerName} deleted ${targetIds.length > 1 ? `${targetIds.length} objects` : (obj.label || obj.type)}`);
        targetIds.forEach(id => removeObject(id));
    };
    const front = () => bringManyToFront(targetIds);
    const shuffle = () => shuffleDeck(obj.id, playerName);
    const drawTop = () => drawTopCard(obj.id, playerId, playerName);
    const drawBot = () => drawBottomCard(obj.id, playerId, playerName);
    const takeTop = () => takeTopCard(obj.id, playerName);
    const flipEntireDeck = () => flipDeck(obj.id, playerName);
    const dupe = () => duplicateObjects(targetIds, playerName);
    const viewImage = () => onViewImage?.({ url: obj.imageUrl, label: obj.label });

    // Multi-select: create deck from selected cards
    const selCards = selectedIds.filter(id => {
        const o = objects.find(x => x.id === id);
        return o && o.type === 'card' && !o.ownerId;
    });
    const canMakeDeck = selCards.length > 1 && selCards.includes(obj.id);
    const makeDeck = () => createDeck(selCards, playerName);

    const handlePeek = () => {
        const num = window.prompt('How many cards do you want to peek?', '5');
        const count = parseInt(num);
        if (!isNaN(count) && count > 0) {
            setPeekingDeck(obj.id, playerName, count);
        }
    };

    const menuItems = [
        // View image (any type with imageUrl, prevent for decks to avoid cheating)
        obj.imageUrl && !isDeck && { label: '🔍 View Full Image', fn: viewImage, highlight: true },
        obj.imageUrl && !isDeck && { label: SEP },

        { label: '↺  Rotate 90°', fn: rotate },
        !isInHand && { label: '⬆  Bring to Front', fn: front },

        // Hand-specific
        isInHand && { label: '▶  Play Card (face-up)', fn: () => playCard(false), highlight: true },
        isInHand && { label: '🌘  Play Card (face-down)', fn: () => playCard(true), highlight: true },


        // Board card actions
        obj.type === 'card' && !isInHand && !isDeck && { label: '🔄 Flip Card', fn: flip },
        obj.type === 'card' && !isInHand && !isDeck && { label: `✋ Send to Hand ${targetIds.length > 1 ? `(${targetIds.length})` : ''}`, fn: toHandMany },

        // Deck actions (Only if part of a deck)
        isDeck && !isInHand && { label: '🔍 Peek Top Cards', fn: handlePeek, highlight: true },
        isDeck && !isInHand && { label: '🔄 Take Top Card', fn: takeTop, highlight: true },
        isDeck && !isInHand && { label: '🌪 Flip Entire Deck', fn: flipEntireDeck },
        isDeck && !isInHand && { label: '🃏 Draw Top Card', fn: drawTop },
        isDeck && !isInHand && { label: '⬇ Draw Bottom Card', fn: drawBot },
        isDeck && !isInHand && { label: '🔀 Shuffle Deck', fn: shuffle },

        // Multi-select: stack into deck
        canMakeDeck && { label: SEP },
        canMakeDeck && { label: `📦 Stack into Deck (${selCards.length})`, fn: makeDeck, highlight: true },

        { label: SEP },
        !isInHand && { label: `👯 Duplicate ${targetIds.length > 1 ? `(${targetIds.length})` : ''}`, fn: dupe },
        { label: '🗑 Delete', fn: del, danger: true },
    ].filter(Boolean);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 226;
    const menuH = menuItems.length * 34 + 8;
    const x = Math.min(menu.x, vw - menuW - 8);
    const y = Math.min(menu.y, vh - menuH - 8);

    return createPortal(
        <div
            className="context-menu z-ctx-menu fixed bg-stone-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1"
            style={{ left: x, top: y, width: menuW, zIndex: 99999 }}
            onClick={e => e.stopPropagation()}
        >
            <div className="px-3 py-1.5 text-xs text-stone-500 font-semibold uppercase tracking-wider border-b border-white/5 mb-1">
                {selectedIds.length > 1
                    ? `${selectedIds.length} objects selected`
                    : `${obj.type} — ${obj.label || '(unnamed)'}`}
            </div>
            {menuItems.map((item, i) =>
                item.label === SEP ? (
                    <div key={i} className="mx-2 my-1 border-t border-white/10" />
                ) : (
                    <button
                        key={i}
                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-2
                            ${item.danger ? 'text-red-400 hover:bg-red-900/40' :
                                item.highlight ? 'text-green-400 hover:bg-green-900/30' :
                                    'text-stone-200 hover:bg-white/10'}`}
                        onClick={action(item.fn)}
                    >
                        {item.label}
                    </button>
                )
            )}
        </div>,
        document.body
    );
}
