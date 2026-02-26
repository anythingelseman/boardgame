import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import useGameStore from '../store/gameStore';
import useRoomStore from '../store/roomStore';

const PUSHER_KEY = 'ac8b4537a8529842be77';
const PUSHER_CLUSTER = 'ap1';

/**
 * Custom hook to handle Pusher realtime synchronization.
 * Uses Presence Channels to track players and coordinate object updates.
 */
export default function useMultiplayer() {
    const pusherRef = useRef(null);
    const channelRef = useRef(null);
    const isReceiving = useRef(false);
    const pendingPos = useRef({});
    const lastSentPos = useRef({}); // Track last broadcast position per object
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
                channel.trigger(`client-${type}`, data);
            }
        };

        const flushPositions = () => {
            throttleTimer.current = null;
            const updates = pendingPos.current;
            if (Object.keys(updates).length === 0) return;
            pendingPos.current = {};

            // Filter out objects that haven't moved enough since last sent
            const filteredUpdates = {};
            for (const [id, pos] of Object.entries(updates)) {
                const last = lastSentPos.current[id] || { x: -9999, y: -9999 };
                const dist = Math.sqrt(Math.pow(pos.x - last.x, 2) + Math.pow(pos.y - last.y, 2));

                // Only send if moved at least 5 pixels
                if (dist > 5) {
                    filteredUpdates[id] = pos;
                    lastSentPos.current[id] = { x: pos.x, y: pos.y };
                }
            }

            if (Object.keys(filteredUpdates).length > 0) {
                broadcast('OBJECTS_UPDATE_BATCH', { updates: filteredUpdates });
            }
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
                        // ULTRA ECONOMY: 250ms throttle for moves (4 times per second)
                        throttleTimer.current = setTimeout(flushPositions, 250);
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
                    upsertPlayer({
                        id: member.id,
                        name: member.info.name,
                        color: member.info.color || '#f59e0b',
                        cursor: null
                    });
                }
            });
            // Send full board state to everyone to ensure we are aligned
            broadcast('STATE_SYNC', {
                objects: useGameStore.getState().objects,
                targetId: 'all',
            });
        });

        channel.bind('pusher:member_added', (member) => {
            console.log('[Multiplayer] Player joined:', member.info.name);
            upsertPlayer({
                id: member.id,
                name: member.info.name,
                color: member.info.color || '#f59e0b',
                cursor: null
            });
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
                    if (msg.senderId !== playerId) updateCursor(msg.senderId, msg.cursor);
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
        if (document.hidden) return;
        const now = Date.now();

        // GHOST MODE: Only update cursor every 1.5 seconds
        if (now - lastCursorSent.current < 1500) return;

        // Big Threshold: 60 pixels
        const dx = cursor.x - lastCursorPos.current.x;
        const dy = cursor.y - lastCursorPos.current.y;
        if (Math.abs(dx) < 60 && Math.abs(dy) < 60) return;

        if (channelRef.current?.subscribed) {
            channelRef.current.trigger('client-CURSOR', { senderId: playerId, cursor });
            lastCursorSent.current = now;
            lastCursorPos.current = cursor;
        }
    };

    return { broadcastCursor };
}
