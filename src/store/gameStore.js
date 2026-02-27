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
    board: { width: 600, height: 400, label: 'Board', color: '#ffffff', textColor: '#000000' },
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
        set(state => {
            if (state.objects.some(o => o.id === obj.id)) return state;
            if (obj.zIndex > maxZ) maxZ = obj.zIndex;
            return { objects: [...state.objects, obj] };
        });
    },

    // ── Update ───────────────────────────────────────────────
    updateObject: (id, changes) => {
        if (changes.zIndex && changes.zIndex > maxZ) maxZ = changes.zIndex;
        set(state => ({
            objects: state.objects.map(o => o.id === id ? { ...o, ...changes } : o),
        }));
    },

    updateManyObjects: (updates) => {
        set(state => ({
            objects: state.objects.map(o => {
                const change = updates[o.id];
                if (!change) return o;
                if (change.zIndex && change.zIndex > maxZ) maxZ = change.zIndex;
                return { ...o, ...change };
            }),
        }));
    },

    duplicateObject: (id, playerName) => {
        const { objects, addLog } = get();
        const original = objects.find(o => o.id === id);
        if (!original) return null;

        const copy = {
            ...original,
            id: generateId(),
            x: original.x + 20,
            y: original.y + 20,
            zIndex: ++maxZ,
            ownerId: null, // Duplicates shouldn't go to hand automatically
        };

        addLog(`${playerName} duplicated ${original.label || original.type}`);
        set(state => ({ objects: [...state.objects, copy] }));
        return copy.id;
    },

    toHand: (obj, playerId, playerName) => {
        const { addLog, updateObject } = get();
        addLog(`${playerName} took ${obj.label || obj.type} to hand`);
        updateObject(obj.id, { ownerId: playerId, flipped: false, deckId: null });
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
        const { objects } = get();
        // 1. Get the targeted objects and sort them by current zIndex to preserve relative order
        const targets = objects
            .filter(o => ids.includes(o.id))
            .sort((a, b) => a.zIndex - b.zIndex);

        // 2. Map new z-indices to them in that same order
        const updates = {};
        targets.forEach(o => {
            updates[o.id] = ++maxZ;
        });

        // 3. Apply updates
        set(state => ({
            objects: state.objects.map(o =>
                updates[o.id] ? { ...o, zIndex: updates[o.id] } : o
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
        // Proximity fallback for loose cards (increased radius)
        return objects.filter(o =>
            o.type === 'card' && !o.ownerId &&
            Math.abs(o.x - leader.x) < 100 && Math.abs(o.y - leader.y) < 100
        );
    },

    shuffleDeck: (leaderId, playerName) => {
        const { addLog, _getDeck } = get();
        const deck = _getDeck(leaderId);
        if (deck.length < 2) return;
        const leader = deck.find(d => d.id === leaderId) || deck[0];

        // 1. Properly Shuffle the cards using Fisher-Yates
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // 2. Assign BRAND NEW, HIGHER z-indices and exact positioning
        // This guarantees the order is 100% randomized and unique
        const updates = {};
        shuffled.forEach((card) => {
            // Force unique new indices to ensure drawing order follows the shuffle
            updates[card.id] = {
                zIndex: ++maxZ,
                x: leader.x,
                y: leader.y,
                rotation: leader.rotation
            };
        });

        addLog(`${playerName} shuffled the deck (${deck.length} cards)`);
        set(state => ({
            lastShuffleInfo: { name: playerName, count: deck.length, timestamp: Date.now() },
            objects: state.objects.map(o => updates[o.id] ? { ...o, ...updates[o.id] } : o)
        }));
    },

    drawTopCard: (leaderId, ownerId = null, playerName) => {
        const deck = get()._getDeck(leaderId);
        if (deck.length === 0) return;

        // Strictly pick the one with the highest zIndex
        const top = [...deck].sort((a, b) => b.zIndex - a.zIndex)[0];

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

    drawBottomCard: (leaderId, ownerId = null, playerName) => {
        const deck = get()._getDeck(leaderId).sort((a, b) => b.zIndex - a.zIndex);
        const bottom = deck[deck.length - 1]; // Draw the one with the lowest zIndex
        if (!bottom) return;

        if (ownerId && playerName) {
            get().addLog(`${playerName} drew from the bottom`);
        }

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
        const deck = get()._getDeck(leaderId).filter(o => !o.ownerId);
        if (deck.length === 0) return;

        const topCard = [...deck].sort((a, b) => b.zIndex - a.zIndex)[0];
        const targetFlipped = !topCard.flipped;

        get().addLog(`${playerName} flipped the entire deck (${deck.length} cards)`);

        // Pre-calculate z-indices to be safe
        const updates = {};
        deck.forEach(c => { updates[c.id] = { zIndex: ++maxZ, flipped: targetFlipped }; });

        set(state => ({
            objects: state.objects.map(o => updates[o.id] ? { ...o, ...updates[o.id] } : o)
        }));
    },

    // Stack selected cards into a face-down deck — assigns shared deckId
    createDeck: (ids, playerName) => {
        const { objects, addLog } = get();

        // 1. Find which deck-IDs are involved in this selection
        const involvedDecks = new Set();
        ids.forEach(id => {
            const obj = objects.find(o => o.id === id);
            if (obj?.deckId) involvedDecks.add(obj.deckId);
        });

        // 2. Gather ALL cards involved (either selected OR sharing an involved deckId)
        const pool = objects.filter(o =>
            ids.includes(o.id) || (o.deckId && involvedDecks.has(o.deckId))
        );

        if (pool.length < 2) return;

        // 3. Separate and Sort
        // deckMembers = Cards already in a group (become the BASE)
        // looseCards  = Standalone cards (become the TOP)
        const deckMembers = pool.filter(o => o.deckId).sort((a, b) => a.zIndex - b.zIndex);
        const looseCards = pool.filter(o => !o.deckId).sort((a, b) => a.zIndex - b.zIndex);

        // Final Order: Existing Deck order at bottom -> New loose cards on top
        const cards = [...deckMembers, ...looseCards];

        addLog(`${playerName} created a deck with ${cards.length} cards`);

        const newDeckId = generateId();
        const cx = Math.round(cards.reduce((s, c) => s + c.x, 0) / cards.length);
        const cy = Math.round(cards.reduce((s, c) => s + c.y, 0) / cards.length);

        // 4. Assign new sequential heights
        const updates = {};
        cards.forEach((c, i) => {
            updates[c.id] = {
                zIndex: ++maxZ,
                // Add tiny jitter to ensure perfect stacking detection
                x: cx + (i * 0.1),
                y: cy + (i * 0.1)
            };
        });

        set(state => ({
            objects: state.objects.map(o =>
                updates[o.id]
                    ? { ...o, ...updates[o.id], rotation: 0, flipped: true, deckId: newDeckId }
                    : o
            ),
            selectedIds: [],
        }));
    },

    // ── Board load / clear ───────────────────────────────────
    loadBoard: (loadedObjects) => {
        // Self-healing: Filter out any duplicates by ID that might exist in old saves
        const seen = new Set();
        const uniqueObjects = loadedObjects.filter(obj => {
            if (seen.has(obj.id)) return false;
            seen.add(obj.id);
            return true;
        });

        // Hydrate: ensure every object has all modern properties
        const hydrated = uniqueObjects.map(obj => {
            const template = TYPES[obj.type] || TYPES.card;
            return {
                ...DEFAULT_OBJECT,
                ...template,
                ...obj
            };
        });

        maxZ = Math.max(10, ...hydrated.map(o => o.zIndex || 1));
        set({ objects: hydrated, selectedIds: [] });
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
