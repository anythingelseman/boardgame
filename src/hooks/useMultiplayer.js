import { useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';
import useRoomStore from '../store/roomStore';

/**
 * BroadcastChannel multiplayer sync.
 *
 * Design:
 *  - Zustand subscription diffs objects and sends granular messages.
 *  - isReceiving flag (reset SYNCHRONOUSLY, not via RAF) prevents echo.
 *    Zustand listeners fire synchronously inside set(), so:
 *      isReceiving = true → store.updateObject() → listener skips → isReceiving = false
 *    is safe and has zero timing gap.
 *  - Position-only (x/y/zIndex) updates throttled to ~30fps.
 *  - PLAYER_JOIN only replied to once per player (alreadyKnown guard).
 *  - STATE_SYNC carries targetId so only the new joiner calls loadBoard().
 */
export default function useMultiplayer() {
    const channelRef = useRef(null);
    const isReceiving = useRef(false);
    const pendingPos = useRef({});
    const throttleTimer = useRef(null);

    const { roomCode, playerId, setChannel, upsertPlayer, removePlayer, updateCursor } = useRoomStore();

    useEffect(() => {
        if (!roomCode) return;

        const ch = new BroadcastChannel(`boardgame-${roomCode}`);
        channelRef.current = ch;
        setChannel(ch);

        const POSITION_KEYS = new Set(['x', 'y', 'zIndex']);

        // Flush throttled position updates
        const flushPositions = () => {
            throttleTimer.current = null;
            const pending = pendingPos.current;
            pendingPos.current = {};
            for (const [objectId, changes] of Object.entries(pending)) {
                ch.postMessage({ type: 'OBJECT_UPDATE', objectId, changes });
            }
        };

        // ── Subscribe to local store; diff and broadcast changes ─────────
        const unsubscribe = useGameStore.subscribe((state, prev) => {
            if (isReceiving.current) return;
            if (state.objects === prev.objects) return;

            const prevMap = new Map(prev.objects.map(o => [o.id, o]));
            const newMap = new Map(state.objects.map(o => [o.id, o]));

            // Added objects
            for (const [id, obj] of newMap) {
                if (!prevMap.has(id)) {
                    ch.postMessage({ type: 'OBJECT_ADD', object: obj });
                }
            }
            // Removed objects
            for (const [id] of prevMap) {
                if (!newMap.has(id)) {
                    ch.postMessage({ type: 'OBJECT_REMOVE', objectId: id });
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
                    ch.postMessage({ type: 'OBJECT_UPDATE', objectId: id, changes });
                }
            }
        });

        // Announce ourselves
        const self = useRoomStore.getState().players.find(p => p.id === playerId);
        if (self) ch.postMessage({ type: 'PLAYER_JOIN', player: self });

        // ── Handle incoming messages ─────────────────────────────────────
        ch.onmessage = (e) => {
            const msg = e.data;
            const store = useGameStore.getState();

            switch (msg.type) {

                case 'OBJECT_ADD':
                    // Set flag, update store (listener fires & skips), clear flag — all sync
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
                    // Only the intended recipient applies the full board
                    if (msg.targetId !== playerId) break;
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

                    // Check BEFORE upserting so we only reply the first time
                    const alreadyKnown = useRoomStore.getState().players
                        .some(p => p.id === msg.player.id);

                    upsertPlayer(msg.player);

                    if (!alreadyKnown) {
                        // Reply once with our own presence
                        const selfNow = useRoomStore.getState().players
                            .find(p => p.id === playerId);
                        if (selfNow) {
                            ch.postMessage({ type: 'PLAYER_JOIN', player: selfNow });
                        }
                        // Push full board only to the new joiner
                        ch.postMessage({
                            type: 'STATE_SYNC',
                            objects: store.objects,
                            targetId: msg.player.id,
                        });
                    }
                    break;
                }

                case 'PLAYER_LEAVE':
                    removePlayer(msg.playerId);
                    break;

                default:
                    break;
            }
        };

        const handleUnload = () => {
            ch.postMessage({ type: 'PLAYER_LEAVE', playerId });
            ch.close();
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            unsubscribe();
            if (throttleTimer.current) clearTimeout(throttleTimer.current);
            handleUnload();
            window.removeEventListener('beforeunload', handleUnload);
            channelRef.current = null;
        };
    }, [roomCode]); // eslint-disable-line

    const broadcastCursor = (cursor) => {
        if (!channelRef.current) return;
        channelRef.current.postMessage({ type: 'CURSOR', playerId, cursor });
    };

    return { broadcastCursor };
}
