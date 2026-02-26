import { create } from 'zustand';
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
    card: { width: 80, height: 120, label: 'Card', color: '#fdf6e3' },
    token: { width: 56, height: 56, label: 'Token', color: '#ef4444' },
    tile: { width: 96, height: 96, label: 'Tile', color: '#78716c' },
    board: { width: 600, height: 400, label: 'Board', color: '#2c5f2e' },
};

let maxZ = 10;

const useGameStore = create((set, get) => ({
    objects: [],
    selectedIds: [],

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

    shuffleDeck: (leaderId) => {
        const deck = get()._getDeck(leaderId);
        if (deck.length < 2) return;
        const zVals = deck.map(d => d.zIndex).sort((a, b) => a - b);
        const shuffled = [...deck].sort(() => Math.random() - 0.5);
        const updates = shuffled.reduce((acc, card, i) => {
            acc[card.id] = zVals[i];
            return acc;
        }, {});
        set(state => ({
            objects: state.objects.map(o =>
                updates[o.id] !== undefined ? { ...o, zIndex: updates[o.id] } : o
            ),
        }));
    },

    drawTopCard: (leaderId, ownerId = null) => {
        const deck = get()._getDeck(leaderId).sort((a, b) => b.zIndex - a.zIndex);
        const top = deck[0];
        if (!top) return;
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

    // Stack selected cards into a face-down deck — assigns shared deckId
    createDeck: (ids) => {
        const { objects } = get();
        const cards = ids.map(id => objects.find(o => o.id === id)).filter(Boolean);
        if (cards.length < 2) return;
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

    // ── App Modes ────────────────────────────────────────────
    mode: 'play',
    setMode: (mode) => set({ mode }),
    showGrid: false,
    toggleGrid: () => set(state => ({ showGrid: !state.showGrid })),
    background: 'felt-green',
    setBackground: (bg) => set({ background: bg }),
}));

export default useGameStore;
