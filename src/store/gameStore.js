import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { generateId } from '../utils/idUtils';

const DEFAULT_OBJECT = {
    x: 300,
    y: 200,
    rotation: 0,
    flipped: false,
    zIndex: 1,
    ownerId: null,
    deckId: null,   // set by createDeck; cards with same deckId move/act as one deck
    label: '',
    imageUrl: null,
    color: '#fdf6e3',
};

const TYPES = {
    card: { width: 300, height: 420, label: 'Card', color: '#fdf6e3' },
    token: { width: 80, height: 80, label: 'Token', color: '#ef4444' },
    tile: { width: 400, height: 400, label: 'Tile', color: '#78716c' },
    board: { width: 6000, height: 4000, label: 'Board', color: '#ffffff', textColor: '#000000' },
};

let maxZ = 10;

const useGameStore = create(subscribeWithSelector((set, get) => ({
    objects: [],
    selectedIds: [],
    logs: [], // [{ id, text, time }]
    lastShuffleInfo: null, // { name, count, timestamp }

    addLog: (text) => set(state => ({
        logs: [{ id: generateId(), text, time: Date.now() }, ...state.logs].slice(0, 50)
    })),

    // ── Spawn / Add ──────────────────────────────────────────
    spawnObject: (type, overrides = {}) => {
        const template = TYPES[type] || TYPES.card;
        const obj = {
            ...DEFAULT_OBJECT,
            ...template,
            id: generateId(),
            type,
            zIndex: ++maxZ,
            ...overrides,
        };
        set(state => ({ objects: [...state.objects, obj] }));
        return obj.id;
    },

    addObject: (obj) => {
        if (obj.zIndex > maxZ) maxZ = obj.zIndex;
        set(state => ({ objects: [...state.objects, obj] }));
    },

    // ── Update ───────────────────────────────────────────────
    updateObject: (id, changes) => {
        set(state => ({
            objects: state.objects.map(o => o.id === id ? { ...o, ...changes } : o),
        }));
    },

    updateManyObjects: (updates) => {
        set(state => ({
            objects: state.objects.map(o =>
                updates[o.id] ? { ...o, ...updates[o.id] } : o
            ),
        }));
    },

    removeObject: (id) => {
        set(state => ({
            objects: state.objects.filter(o => o.id !== id),
            selectedIds: state.selectedIds.filter(x => x !== id),
        }));
    },

    bringToFront: (id) => {
        set(state => ({
            objects: state.objects.map(o =>
                o.id === id ? { ...o, zIndex: ++maxZ } : o
            ),
        }));
    },

    bringManyToFront: (ids) => {
        set(state => ({
            objects: state.objects.map(o =>
                ids.includes(o.id) ? { ...o, zIndex: ++maxZ } : o
            ),
        }));
    },

    // ── Selection ────────────────────────────────────────────
    selectObject: (id) => set({ selectedIds: [id] }),
    toggleSelect: (id) => set(state => ({
        selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter(x => x !== id)
            : [...state.selectedIds, id],
    })),
    selectMany: (ids) => set({ selectedIds: ids }),
    deselectAll: () => set({ selectedIds: [] }),

    // ── Deck actions ─────────────────────────────────────────
    // Find deck by deckId (preferred) or by proximity fallback
    _getDeck: (leaderId) => {
        const { objects } = get();
        const leader = objects.find(o => o.id === leaderId);
        if (!leader) return [];
        if (leader.deckId) {
            return objects.filter(o => o.deckId === leader.deckId && !o.ownerId);
        }
        // Proximity fallback for loose cards
        return objects.filter(o =>
            o.type === 'card' && !o.ownerId &&
            Math.abs(o.x - leader.x) < 60 && Math.abs(o.y - leader.y) < 60
        );
    },

    shuffleDeck: (leaderId, playerName) => {
        const deck = get()._getDeck(leaderId);
        if (deck.length < 2) return;
        const zVals = deck.map(d => d.zIndex).sort((a, b) => a - b);
        const shuffled = [...deck].sort(() => Math.random() - 0.5);
        const updates = shuffled.reduce((acc, card, i) => {
            acc[card.id] = zVals[i];
            return acc;
        }, {});

        get().addLog(`${playerName} shuffled the deck (${deck.length} cards)`);
        set({ lastShuffleInfo: { name: playerName, count: deck.length, timestamp: Date.now() } });

        set(state => ({
            objects: state.objects.map(o =>
                updates[o.id] !== undefined ? { ...o, zIndex: updates[o.id] } : o
            ),
        }));
    },

    drawTopCard: (leaderId, ownerId = null, playerName) => {
        const deck = get()._getDeck(leaderId).sort((a, b) => b.zIndex - a.zIndex);
        const top = deck[0];
        if (!top) return;

        if (ownerId && playerName) {
            get().addLog(`${playerName} drew a card`);
        }

        set(state => ({
            objects: state.objects.map(o =>
                o.id === top.id
                    ? { ...o, flipped: false, zIndex: ++maxZ, ownerId, deckId: null }
                    : o
            ),
        }));
    },

    drawBottomCard: (leaderId, ownerId = null) => {
        const deck = get()._getDeck(leaderId).sort((a, b) => a.zIndex - b.zIndex);
        const bottom = deck[0];
        if (!bottom) return;
        set(state => ({
            objects: state.objects.map(o =>
                o.id === bottom.id
                    ? { ...o, flipped: false, zIndex: ++maxZ, ownerId, deckId: null }
                    : o
            ),
        }));
    },

    flipTopCard: (leaderId, playerName) => {
        const deck = get()._getDeck(leaderId).sort((a, b) => b.zIndex - a.zIndex);
        const top = deck[0];
        if (!top) return;

        get().addLog(`${playerName} flipped the top card`);

        set(state => ({
            objects: state.objects.map(o =>
                o.id === top.id
                    ? { ...o, flipped: !o.flipped, x: o.x + 90, zIndex: ++maxZ, deckId: null }
                    : o
            ),
        }));
    },

    flipDeck: (leaderId, playerName) => {
        const deck = get()._getDeck(leaderId);
        if (deck.length === 0) return;

        // Use the flip state of the top card to decide the new state
        const topCard = [...deck].sort((a, b) => b.zIndex - a.zIndex)[0];
        const targetFlipped = !topCard.flipped;

        get().addLog(`${playerName} flipped the entire deck (${deck.length} cards)`);

        set(state => ({
            objects: state.objects.map(o => {
                const inDeck = deck.some(d => d.id === o.id);
                return inDeck ? { ...o, flipped: targetFlipped, zIndex: ++maxZ } : o;
            }),
        }));
    },

    // Stack selected cards into a face-down deck — assigns shared deckId
    createDeck: (ids, playerName) => {
        const { objects, addLog } = get();
        const cards = ids.map(id => objects.find(o => o.id === id)).filter(Boolean);
        if (cards.length < 2) return;

        addLog(`${playerName} created a deck with ${cards.length} cards`);

        const newDeckId = generateId();
        const cx = Math.round(cards.reduce((s, c) => s + c.x, 0) / cards.length);
        const cy = Math.round(cards.reduce((s, c) => s + c.y, 0) / cards.length);
        set(state => ({
            objects: state.objects.map(o =>
                ids.includes(o.id)
                    ? { ...o, x: cx, y: cy, rotation: 0, flipped: true, deckId: newDeckId, zIndex: ++maxZ }
                    : o
            ),
            selectedIds: [],
        }));
    },

    // ── Board load / clear ───────────────────────────────────
    loadBoard: (objects) => {
        maxZ = Math.max(10, ...objects.map(o => o.zIndex || 1));
        set({ objects, selectedIds: [] });
    },

    clearBoard: () => set({ objects: [], selectedIds: [] }),

    // ── Dice System ──────────────────────────────────────────
    diceCount: 1,
    diceResults: [],
    lastRollInfo: null, // { name: 'Alex', results: [5, 2], timestamp: 123 }

    setDiceCount: (count) => set({ diceCount: Math.min(4, Math.max(1, count)) }),

    rollDice: (playerName) => {
        const { diceCount, addLog } = get();
        const results = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
        const rollInfo = { name: playerName, results, timestamp: Date.now() };

        const rollStr = results.join(', ');
        addLog(`${playerName} rolled ${diceCount} dice: [${rollStr}]`);

        set({ diceResults: results, lastRollInfo: rollInfo });
        return results;
    },

    setDiceResults: (results) => set({ diceResults: results }),
    setLastRollInfo: (info) => set({ lastRollInfo: info }),
    setLastShuffleInfo: (info) => set({ lastShuffleInfo: info }),

    // ── App Modes ────────────────────────────────────────────
    mode: 'play',
    setMode: (mode) => set({ mode }),
    showGrid: false,
    toggleGrid: () => set(state => ({ showGrid: !state.showGrid })),
    background: 'felt-green',
    setBackground: (bg) => set({ background: bg }),
})));

export default useGameStore;
