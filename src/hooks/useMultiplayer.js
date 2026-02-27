import { useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';
import useRoomStore from '../store/roomStore';

// For local dev, we use ws://localhost:4000
// After hosting, you will replace this with your server URL
const WS_URL = window.location.hostname === 'localhost'
    ? 'ws://localhost:4000'
    : `wss://${window.location.hostname}`; // Fallback assuming same host

export default function useMultiplayer() {
    const wsRef = useRef(null);
    const isReceiving = useRef(false);
    const pendingPos = useRef({});
    const throttleTimer = useRef(null);

    const { roomCode, playerId, playerName, upsertPlayer, removePlayer, updateCursor, players } = useRoomStore();
    const self = players.find(p => p.id === playerId);

    useEffect(() => {
        if (!roomCode) return;

        const ws = new WebSocket(`${WS_URL}?room=${roomCode}`);
        wsRef.current = ws;

        const broadcast = (type, data) => {
            if (document.hidden) return;
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type, ...data }));
            }
        };

        const flushPositions = () => {
            throttleTimer.current = null;
            const updates = pendingPos.current;
            if (Object.keys(updates).length === 0) return;
            pendingPos.current = {};
            broadcast('OBJECTS_UPDATE_BATCH', { updates });
        };

        ws.onopen = () => {
            console.log('[Multiplayer] Connected to WebSocket');
            // Join the room with player details
            broadcast('JOIN', {
                playerId,
                playerName,
                playerColor: self?.color || '#f59e0b'
            });
            // Request board sync from others
            broadcast('STATE_SYNC_REQ', {});
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            const store = useGameStore.getState();

            switch (msg.type) {
                case 'SYNC_MEMBERS':
                    msg.members.forEach(m => upsertPlayer(m));
                    break;
                case 'MEMBER_ADDED':
                    upsertPlayer(msg.member);
                    break;
                case 'MEMBER_REMOVED':
                    removePlayer(msg.playerId);
                    break;
                case 'STATE_SYNC_REQ':
                    // Someone new joined, send them the board
                    broadcast('STATE_SYNC', { objects: store.objects, targetId: 'all' });
                    break;
                case 'STATE_SYNC':
                    if (msg.targetId !== 'all' && msg.targetId !== playerId) break;
                    isReceiving.current = true;
                    store.loadBoard(msg.objects);
                    isReceiving.current = false;
                    break;
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
                case 'CURSOR':
                    if (msg.senderId !== playerId) updateCursor(msg.senderId, msg.cursor);
                    break;
                case 'DICE_ROLL':
                    if (!msg.rollInfo) break;
                    isReceiving.current = true;
                    store.setLastRollInfo(msg.rollInfo);
                    store.setDiceResults(msg.rollInfo.results);
                    isReceiving.current = false;
                    break;
            }
        };

        // ── Store Subscription (Unlimited Broadcasts) ───────────────────
        let prevObjects = useGameStore.getState().objects;
        const unsubscribe = useGameStore.subscribe((state) => {
            if (isReceiving.current || state.objects === prevObjects) return;

            const prevMap = new Map(prevObjects.map(o => [o.id, o]));
            const newMap = new Map(state.objects.map(o => [o.id, o]));

            // Logic for detecting changes
            for (const [id, obj] of newMap) {
                if (!prevMap.has(id)) {
                    broadcast('OBJECT_ADD', { object: obj });
                } else {
                    const prevObj = prevMap.get(id);
                    if (obj === prevObj) continue;

                    const changes = {};
                    for (const key of Object.keys(obj)) {
                        if (obj[key] !== prevObj[key]) changes[key] = obj[key];
                    }
                    if (!Object.keys(changes).length) continue;

                    if (Object.keys(changes).every(k => ['x', 'y', 'zIndex'].includes(k))) {
                        pendingPos.current[id] = { ...pendingPos.current[id], ...changes };
                        if (!throttleTimer.current) {
                            // SMOOTH MODE: 60ms throttle (approx 16fps)
                            throttleTimer.current = setTimeout(flushPositions, 60);
                        }
                    } else {
                        broadcast('OBJECT_UPDATE', { objectId: id, changes });
                    }
                }
            }
            // detect removals
            for (const [id] of prevMap) {
                if (!newMap.has(id)) broadcast('OBJECT_REMOVE', { objectId: id });
            }
            prevObjects = state.objects;
        });

        const unsubDice = useGameStore.subscribe(
            (state) => state.lastRollInfo,
            (rollInfo) => {
                if (!isReceiving.current && rollInfo) {
                    broadcast('DICE_ROLL', { rollInfo });
                }
            }
        );

        return () => {
            unsubscribe();
            unsubDice();
            if (throttleTimer.current) clearTimeout(throttleTimer.current);
            ws.close();
        };
    }, [roomCode]); // eslint-disable-line

    const broadcastCursor = (cursor) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'CURSOR', senderId: playerId, cursor }));
        }
    };

    return { broadcastCursor };
}
