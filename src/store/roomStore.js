import { create } from 'zustand';
import { generateRoomCode, generateId } from '../utils/idUtils';

const useRoomStore = create((set, get) => ({
    roomCode: null,
    role: null,      // 'host' | 'player'
    playerId: generateId(),
    playerName: 'Player',
    players: [],     // [{ id, name, color, cursor }]
    connected: false,
    channel: null,

    playerColors: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#ec4899'],

    createRoom: (name) => {
        const code = generateRoomCode();
        const { playerId, playerColors } = get();
        const self = { id: playerId, name: name || 'Host', color: playerColors[0], cursor: { x: 0, y: 0 } };
        set({
            roomCode: code,
            role: 'host',
            playerName: name || 'Host',
            players: [self],
            connected: true,
        });
        return code;
    },

    joinRoom: (code, name) => {
        const { playerId, playerColors } = get();
        const colorIdx = Math.floor(Math.random() * playerColors.length);
        const self = { id: playerId, name: name || 'Player', color: playerColors[colorIdx], cursor: { x: 0, y: 0 } };
        set({
            roomCode: code.toUpperCase(),
            role: 'player',
            playerName: name || 'Player',
            players: [self],
            connected: true,
        });
    },

    leaveRoom: () => {
        const ch = get().channel;
        if (ch) ch.close();
        set({ roomCode: null, role: null, players: [], connected: false, channel: null });
    },

    setChannel: (ch) => set({ channel: ch }),

    upsertPlayer: (player) => {
        set(state => {
            const existing = state.players.find(p => p.id === player.id);
            if (existing) {
                return { players: state.players.map(p => p.id === player.id ? { ...p, ...player } : p) };
            }
            return { players: [...state.players, player] };
        });
    },

    removePlayer: (playerId) => {
        set(state => ({ players: state.players.filter(p => p.id !== playerId) }));
    },

    updateCursor: (playerId, cursor) => {
        set(state => ({
            players: state.players.map(p => p.id === playerId ? { ...p, cursor } : p),
        }));
    },
}));

export default useRoomStore;
