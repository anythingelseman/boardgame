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

    const { roomCode, playerId, playerName, upsertPlayer, removePlayer, updateCursor, players } = useRoomStore();
    const self = players.find(p => p.id === playerId);

    useEffect(() => {
        if (!roomCode) return;

        // Initialize Pusher with Presence support
        const pusher = new Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
            authEndpoint: '/api/auth',
            auth: {
                params: {
                    playerId,
                    playerName,
                    playerColor: self?.color || '#f59e0b'
                }
            }
        });
        pusherRef.current = pusher;

        // Note: Presence channels require 'presence-' prefix
        const channelName = `presence-room-${roomCode}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel;

        const broadcast = (type, data) => {
            // STOP ALL MESSAGES if tab is not visible
            if (document.hidden) return;

            if (channel.subscribed) {
                // Pusher client events MUST be prefixed with 'client-'
                channel.trigger(`client-${type}`, data);
            }
        };

        const flushPositions = () => {
            throttleTimer.current = null;
            const updates = pendingPos.current;
            if (Object.keys(updates).length === 0) return;
            pendingPos.current = {};

            // BATCH: Send all updates in a single Pusher message
            broadcast('OBJECTS_UPDATE_BATCH', { updates });
        };

        // ── Store Subscription ───────────────────────────────────────────
        let prevObjects = useGameStore.getState().objects;
        const unsubscribe = useGameStore.subscribe((state) => {
            if (isReceiving.current || state.objects === prevObjects) return;

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
                        // EXTREME ECONOMY: 150ms throttle for moves
                        throttleTimer.current = setTimeout(flushPositions, 150);
                    }
                } else {
                    broadcast('OBJECT_UPDATE', { objectId: id, changes });
                }
            }
            prevObjects = state.objects;
        });

        // ── Presence Events (Automatic Discovery) ────────────────────────
        channel.bind('pusher:subscription_succeeded', (members) => {
            console.log('[Multiplayer] Presence synchronized. Members:', members.count);
            members.each(member => {
                if (member.id !== playerId) {
                    upsertPlayer({ id: member.id, name: member.info.name, color: '#f59e0b', cursor: null });
                }
            });
            // Send full board state to everyone to ensure we are aligned
            broadcast('STATE_SYNC', {
                objects: useGameStore.getState().objects,
                targetId: 'all', // Simplify sync
            });
        });

        channel.bind('pusher:member_added', (member) => {
            console.log('[Multiplayer] Player joined:', member.info.name);
            upsertPlayer({ id: member.id, name: member.info.name, color: '#f59e0b', cursor: null });
        });

        channel.bind('pusher:member_removed', (member) => {
            console.log('[Multiplayer] Player left:', member.id);
            removePlayer(member.id);
        });

        // ── Handle Incoming Messages ─────────────────────────────────────
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
                case 'OBJECTS_UPDATE_BATCH':
                    isReceiving.current = true;
                    store.updateManyObjects(msg.updates);
                    isReceiving.current = false;
                    break;
                case 'STATE_SYNC':
                    if (msg.targetId !== 'all' && msg.targetId !== playerId) break;
                    isReceiving.current = true;
                    store.loadBoard(msg.objects);
                    isReceiving.current = false;
                    break;
                case 'CURSOR':
                    if (msg.senderId !== playerId) {
                        updateCursor(msg.senderId, msg.cursor);
                    }
                    break;
            }
        };

        channel.bind('client-OBJECT_ADD', (data) => handleMsg('OBJECT_ADD', data));
        channel.bind('client-OBJECT_REMOVE', (data) => handleMsg('OBJECT_REMOVE', data));
        channel.bind('client-OBJECT_UPDATE', (data) => handleMsg('OBJECT_UPDATE', data));
        channel.bind('client-OBJECTS_UPDATE_BATCH', (data) => handleMsg('OBJECTS_UPDATE_BATCH', data));
        channel.bind('client-STATE_SYNC', (data) => handleMsg('STATE_SYNC', data));
        channel.bind('client-CURSOR', (data) => handleMsg('CURSOR', data));

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
        // SUPER CHEAP: Only 5 updates per second (200ms)
        if (now - lastCursorSent.current < 200) return;

        // Threshold: Only send if moved at least 10 pixels
        const dx = cursor.x - lastCursorPos.current.x;
        const dy = cursor.y - lastCursorPos.current.y;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

        if (channelRef.current?.subscribed) {
            channelRef.current.trigger('client-CURSOR', { senderId: playerId, cursor });
            lastCursorSent.current = now;
            lastCursorPos.current = cursor;
        }
    };

    return { broadcastCursor };
}
