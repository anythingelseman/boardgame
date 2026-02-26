import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import useGameStore from '../store/gameStore';
import useRoomStore from '../store/roomStore';

const PUSHER_KEY = "ac8b4537a8529842be77";
const PUSHER_CLUSTER = "ap1";

/**
 * Pusher (Vercel-compatible) multiplayer sync.
 */
export default function useMultiplayer() {
    const pusherRef = useRef(null);
    const channelRef = useRef(null);
    const isReceiving = useRef(false);
    const pendingPos = useRef({});
    const throttleTimer = useRef(null);

    const { roomCode, playerId, upsertPlayer, removePlayer, updateCursor } = useRoomStore();

    useEffect(() => {
        if (!roomCode) return;

        // Initialize Pusher
        const pusher = new Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
            authEndpoint: '/api/auth', // This hits our Vercel Serverless Function
        });
        pusherRef.current = pusher;

        // Subscribe to a private channel for the room
        // Note: Client events require a 'private-' or 'presence-' prefix
        const channelName = `private-room-${roomCode}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel;

        const broadcast = (type, data) => {
            if (channel.subscribed) {
                // Pusher client events MUST be prefixed with 'client-'
                channel.trigger(`client-${type}`, data);
            }
        };

        const flushPositions = () => {
            throttleTimer.current = null;
            const pending = pendingPos.current;
            pendingPos.current = {};
            for (const [objectId, changes] of Object.entries(pending)) {
                broadcast('OBJECT_UPDATE', { objectId, changes });
            }
        };

        // ── Store Subscription ───────────────────────────────────────────
        let prevObjects = useGameStore.getState().objects;
        const unsubscribe = useGameStore.subscribe((state) => {
            if (isReceiving.current) {
                prevObjects = state.objects;
                return;
            }
            if (state.objects === prevObjects) return;

            const prevMap = new Map(prevObjects.map(o => [o.id, o]));
            const newMap = new Map(state.objects.map(o => [o.id, o]));

            // Added
            for (const [id, obj] of newMap) {
                if (!prevMap.has(id)) broadcast('OBJECT_ADD', { object: obj });
            }
            // Removed
            for (const [id] of prevMap) {
                if (!newMap.has(id)) broadcast('OBJECT_REMOVE', { objectId: id });
            }
            // Changed
            for (const [id, obj] of newMap) {
                const prevObj = prevMap.get(id);
                if (!prevObj || obj === prevObj) continue;

                const changes = {};
                for (const key of Object.keys(obj)) {
                    if (obj[key] !== prevObj[key]) changes[key] = obj[key];
                }
                if (!Object.keys(changes).length) continue;

                if (Object.keys(changes).every(k => ['x', 'y', 'zIndex'].includes(k))) {
                    pendingPos.current[id] = { ...pendingPos.current[id], ...changes };
                    if (!throttleTimer.current) {
                        throttleTimer.current = setTimeout(flushPositions, 33);
                    }
                } else {
                    broadcast('OBJECT_UPDATE', { objectId: id, changes });
                }
            }
            prevObjects = state.objects;
        });

        // ── Handle Incoming Events ───────────────────────────────────────
        channel.bind('subscription_succeeded', () => {
            const self = useRoomStore.getState().players.find(p => p.id === playerId);
            if (self) broadcast('PLAYER_JOIN', { player: self });
        });

        const handleMsg = (type, msg) => {
            const store = useGameStore.getState();
            switch (type) {
                case 'OBJECT_ADD':
                    isReceiving.current = true;
                    store.addObject(msg.object);
                    isReceiving.current = false;
                    break;
                case 'OBJECT_REMOVE':
                    isReceiving.current = true;
                    store.removeObject(msg.objectId);
                    isReceiving.current = false;
                    break;
                case 'OBJECT_UPDATE':
                    isReceiving.current = true;
                    store.updateObject(msg.objectId, msg.changes);
                    isReceiving.current = false;
                    break;
                case 'STATE_SYNC':
                    if (msg.targetId !== playerId) break;
                    isReceiving.current = true;
                    store.loadBoard(msg.objects);
                    isReceiving.current = false;
                    break;
                case 'CURSOR':
                    if (msg.playerId !== playerId) updateCursor(msg.playerId, msg.cursor);
                    break;
                case 'PLAYER_JOIN': {
                    if (msg.player.id === playerId) break;
                    const players = useRoomStore.getState().players;
                    const alreadyKnown = players.some(p => p.id === msg.player.id);
                    upsertPlayer(msg.player);
                    if (!alreadyKnown) {
                        const self = players.find(p => p.id === playerId);
                        if (self) broadcast('PLAYER_JOIN', { player: self });
                        broadcast('STATE_SYNC', {
                            objects: store.objects,
                            targetId: msg.player.id,
                        });
                    }
                    break;
                }
            }
        };

        channel.bind('client-OBJECT_ADD', (data) => handleMsg('OBJECT_ADD', data));
        channel.bind('client-OBJECT_REMOVE', (data) => handleMsg('OBJECT_REMOVE', data));
        channel.bind('client-OBJECT_UPDATE', (data) => handleMsg('OBJECT_UPDATE', data));
        channel.bind('client-STATE_SYNC', (data) => handleMsg('STATE_SYNC', data));
        channel.bind('client-CURSOR', (data) => handleMsg('CURSOR', data));
        channel.bind('client-PLAYER_JOIN', (data) => handleMsg('PLAYER_JOIN', data));

        return () => {
            unsubscribe();
            if (throttleTimer.current) clearTimeout(throttleTimer.current);
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
    }, [roomCode]); // eslint-disable-line

    const lastCursorSent = useRef(0);
    const lastCursorPos = useRef({ x: 0, y: 0 });

    const broadcastCursor = (cursor) => {
        const now = Date.now();
        // Only send every 100ms
        if (now - lastCursorSent.current < 100) return;

        // Only send if moved at least 5 pixels (saves messages when mouse is idle-ish)
        const dx = cursor.x - lastCursorPos.current.x;
        const dy = cursor.y - lastCursorPos.current.y;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

        if (channelRef.current?.subscribed) {
            channelRef.current.trigger('client-CURSOR', { playerId, cursor });
            lastCursorSent.current = now;
            lastCursorPos.current = cursor;
        }
    };

    return { broadcastCursor };
}
