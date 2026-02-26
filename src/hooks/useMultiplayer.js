import { useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';
import useRoomStore from '../store/roomStore';

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${protocol}//${window.location.hostname}:4000`;

/**
 * WebSocket multiplayer sync.
 *
 * Design:
 *  - Connects to the relay server at ws://localhost:4000?room=ROOMCODE
 *  - Zustand subscription diffs objects and sends granular messages.
 *  - isReceiving flag prevents echo-back (synchronous Zustand set → subscribe).
 *  - Position-only (x/y/zIndex) updates throttled to ~30fps.
 *  - PLAYER_JOIN / STATE_SYNC handshake syncs board state for new joiners.
 */
export default function useMultiplayer() {
    const wsRef = useRef(null);
    const isReceiving = useRef(false);
    const pendingPos = useRef({});
    const throttleTimer = useRef(null);

    const { roomCode, playerId, setChannel, upsertPlayer, removePlayer, updateCursor } = useRoomStore();

    useEffect(() => {
        if (!roomCode) return;

        const ws = new WebSocket(`${WS_URL}?room=${roomCode}`);
        wsRef.current = ws;

        // Expose send via the existing setChannel interface (re-used as generic send)
        // We'll send directly via wsRef to keep things simple.

        const POSITION_KEYS = new Set(['x', 'y', 'zIndex']);

        const send = (msg) => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log(`[Multiplayer] Sending ${msg.type}`);
                ws.send(JSON.stringify(msg));
            } else {
                // Queue until open
                ws.addEventListener('open', () => {
                    console.log(`[Multiplayer] Sending queued ${msg.type}`);
                    ws.send(JSON.stringify(msg));
                }, { once: true });
            }
        };

        // Flush throttled position updates
        const flushPositions = () => {
            throttleTimer.current = null;
            const pending = pendingPos.current;
            pendingPos.current = {};
            for (const [objectId, changes] of Object.entries(pending)) {
                send({ type: 'OBJECT_UPDATE', objectId, changes });
            }
        };

        // ── Subscribe to local store; diff and broadcast changes ──────────
        // Zustand 5 subscribe doesn't provide prev state, so we track it manually
        let prevObjects = useGameStore.getState().objects;

        const unsubscribe = useGameStore.subscribe((state) => {
            if (isReceiving.current) {
                prevObjects = state.objects;
                return;
            }
            if (state.objects === prevObjects) return;

            const prevMap = new Map(prevObjects.map(o => [o.id, o]));
            const newMap = new Map(state.objects.map(o => [o.id, o]));

            // Added objects
            for (const [id, obj] of newMap) {
                if (!prevMap.has(id)) {
                    send({ type: 'OBJECT_ADD', object: obj });
                }
            }
            // Removed objects
            for (const [id] of prevMap) {
                if (!newMap.has(id)) {
                    send({ type: 'OBJECT_REMOVE', objectId: id });
                }
            }
            // Changed objects
            for (const [id, obj] of newMap) {
                const prevObj = prevMap.get(id);
                if (!prevObj || obj === prevObj) continue;

                const changes = {};
                for (const key of Object.keys(obj)) {
                    if (obj[key] !== prevObj[key]) changes[key] = obj[key];
                }
                if (!Object.keys(changes).length) continue;

                if (Object.keys(changes).every(k => POSITION_KEYS.has(k))) {
                    // Throttle position-only changes to ~30fps
                    pendingPos.current[id] = { ...pendingPos.current[id], ...changes };
                    if (!throttleTimer.current) {
                        throttleTimer.current = setTimeout(flushPositions, 33);
                    }
                } else {
                    // Structural changes (flip, rotate, color, label…) — immediate
                    send({ type: 'OBJECT_UPDATE', objectId: id, changes });
                }
            }

            prevObjects = state.objects;
        });

        // ── Announce ourselves once the socket is open ────────────────────
        ws.addEventListener('open', () => {
            const self = useRoomStore.getState().players.find(p => p.id === playerId);
            if (self) send({ type: 'PLAYER_JOIN', player: self });
        }, { once: true });

        // ── Handle incoming messages ──────────────────────────────────────
        ws.onmessage = async (e) => {
            let msg;
            try {
                // Handle Blob vs String
                const data = e.data instanceof Blob ? await e.data.text() : e.data;
                msg = JSON.parse(data);
            } catch (err) {
                console.warn('[Multiplayer] Failed to parse message:', err);
                return;
            }

            const store = useGameStore.getState();

            switch (msg.type) {

                case 'OBJECT_ADD':
                    console.log('[Multiplayer] Adding object');
                    isReceiving.current = true;
                    store.addObject(msg.object);
                    isReceiving.current = false;
                    break;

                case 'OBJECT_REMOVE':
                    console.log('[Multiplayer] Removing object');
                    isReceiving.current = true;
                    store.removeObject(msg.objectId);
                    isReceiving.current = false;
                    break;

                case 'OBJECT_UPDATE':
                    // Silently update common position changes
                    isReceiving.current = true;
                    store.updateObject(msg.objectId, msg.changes);
                    isReceiving.current = false;
                    break;

                case 'STATE_SYNC':
                    if (msg.targetId !== playerId) break;
                    console.log('[Multiplayer] Syncing full board state');
                    isReceiving.current = true;
                    store.loadBoard(msg.objects);
                    isReceiving.current = false;
                    break;

                case 'CURSOR':
                    if (msg.playerId !== playerId) {
                        updateCursor(msg.playerId, msg.cursor);
                    }
                    break;

                case 'PLAYER_JOIN': {
                    if (msg.player.id === playerId) break;
                    console.log('[Multiplayer] Player joined:', msg.player.name);

                    const alreadyKnown = useRoomStore.getState().players
                        .some(p => p.id === msg.player.id);

                    upsertPlayer(msg.player);

                    if (!alreadyKnown) {
                        const selfNow = useRoomStore.getState().players
                            .find(p => p.id === playerId);
                        if (selfNow) send({ type: 'PLAYER_JOIN', player: selfNow });

                        send({
                            type: 'STATE_SYNC',
                            objects: useGameStore.getState().objects,
                            targetId: msg.player.id,
                        });
                    }
                    break;
                }

                case 'PLAYER_LEAVE':
                    console.log('[Multiplayer] Player left');
                    removePlayer(msg.playerId);
                    break;

                default:
                    break;
            }
        };

        ws.onerror = (e) => {
            console.error('[Multiplayer] WebSocket error:', e);
        };

        ws.onclose = (e) => {
            console.log(`[Multiplayer] Disconnected (code: ${e.code})`);
        };

        const handleUnload = () => {
            if (ws.readyState === WebSocket.OPEN) {
                send({ type: 'PLAYER_LEAVE', playerId });
            }
            ws.close();
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            unsubscribe();
            if (throttleTimer.current) clearTimeout(throttleTimer.current);
            handleUnload();
            window.removeEventListener('beforeunload', handleUnload);
            wsRef.current = null;
        };
    }, [roomCode]); // eslint-disable-line

    const broadcastCursor = (cursor) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: 'CURSOR', playerId, cursor }));
    };

    return { broadcastCursor };
}
