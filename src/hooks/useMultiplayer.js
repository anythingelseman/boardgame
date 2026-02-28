import { useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';
import useRoomStore from '../store/roomStore';

// FORCE RENDER SERVER for testing, or use local if specified
const RENDER_WS = 'wss://boardgame-196x.onrender.com';
const LOCAL_WS = 'ws://localhost:4000';

const WS_URL = window.location.hostname === 'localhost'
    ? (import.meta.env.VITE_USE_LOCAL_WS ? LOCAL_WS : RENDER_WS)
    : RENDER_WS;

export default function useMultiplayer() {
    const wsRef = useRef(null);
    const isReceiving = useRef(false);
    const pendingPos = useRef({});
    const throttleTimer = useRef(null);
    const heartbeatTimer = useRef(null);

    const { roomCode, playerId, playerName, upsertPlayer, removePlayer, updateCursor, players } = useRoomStore();
    const self = players.find(p => p.id === playerId);

    useEffect(() => {
        if (!roomCode) return;

        console.log(`[Multiplayer] Connecting to ${WS_URL} for room ${roomCode}...`);
        const ws = new WebSocket(`${WS_URL}?room=${roomCode}`);
        wsRef.current = ws;

        const broadcast = (type, data) => {
            if (document.hidden && type === 'CURSOR') return; // Don't sync cursor if tab hidden
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type, senderId: playerId, ...data }));
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
            console.log('%c[Multiplayer] ✅ Connected to Relay Server', 'color: green; font-weight: bold');

            // Start heartbeat to prevent Render from killing idle connection
            heartbeatTimer.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'PING' }));
            }, 25000);

            broadcast('JOIN', {
                playerId,
                playerName,
                playerColor: self?.color || '#f59e0b'
            });
            broadcast('STATE_SYNC_REQ', {});
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'PONG') return;

            const store = useGameStore.getState();

            switch (msg.type) {
                case 'SYNC_MEMBERS':
                    console.log(`[Multiplayer] Members in room:`, msg.members.length);
                    msg.members.forEach(m => upsertPlayer(m));
                    break;
                case 'MEMBER_ADDED':
                    console.log(`[Multiplayer] 👤 Player joined: ${msg.member.name}`);
                    upsertPlayer(msg.member);
                    break;
                case 'MEMBER_REMOVED':
                    console.log(`[Multiplayer] 🚪 Player left: ${msg.playerId}`);
                    removePlayer(msg.playerId);
                    break;
                case 'STATE_SYNC_REQ':
                    console.log(`[Multiplayer] 🔄 Sync requested by new player`);
                    broadcast('STATE_SYNC', { objects: store.objects, targetId: 'all' });
                    break;
                case 'STATE_SYNC':
                    if (msg.targetId !== 'all' && msg.targetId !== playerId) break;
                    console.log(`[Multiplayer] 📥 Received full board state (${msg.objects.length} objects)`);
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
                case 'GAME_LOG':
                    isReceiving.current = true;
                    store.addLog(msg.text);
                    isReceiving.current = false;
                    break;
                case 'SHUFFLE_EVENT':
                    isReceiving.current = true;
                    store.setLastShuffleInfo(msg.info);
                    isReceiving.current = false;
                    break;
            }
        };

        ws.onclose = (e) => {
            console.log(`[Multiplayer] ❌ Disconnected from server (code: ${e.code})`);
            clearInterval(heartbeatTimer.current);
        };

        ws.onerror = (err) => {
            console.error('[Multiplayer] ⚠️ WebSocket Error:', err);
        };

        // ── Store Subscription ───────────────────────────────────────────
        let prevObjects = useGameStore.getState().objects;
        const unsubscribe = useGameStore.subscribe((state) => {
            if (isReceiving.current || state.objects === prevObjects) return;

            const prevMap = new Map(prevObjects.map(o => [o.id, o]));
            const newMap = new Map(state.objects.map(o => [o.id, o]));

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
                            throttleTimer.current = setTimeout(flushPositions, 60);
                        }
                    } else {
                        broadcast('OBJECT_UPDATE', { objectId: id, changes });
                    }
                }
            }
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

        const unsubLogs = useGameStore.subscribe(
            (state) => state.logs,
            (logs, prevLogs) => {
                if (isReceiving.current) return;
                const newLog = logs[0];
                if (newLog && (!prevLogs[0] || newLog.id !== prevLogs[0].id)) {
                    broadcast('GAME_LOG', { text: newLog.text });
                }
            }
        );

        const unsubShuffle = useGameStore.subscribe(
            (state) => state.lastShuffleInfo,
            (info) => {
                if (!isReceiving.current && info) {
                    broadcast('SHUFFLE_EVENT', { info });
                }
            }
        );

        return () => {
            unsubscribe();
            unsubDice();
            unsubLogs();
            unsubShuffle();
            if (throttleTimer.current) clearTimeout(throttleTimer.current);
            clearInterval(heartbeatTimer.current);
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
