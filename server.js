/**
 * BoardSandbox – WebSocket Relay Server
 *
 * Listens on ws://localhost:4000
 * Clients connect with ?room=ROOMCODE
 * Every message from a client is broadcast to all OTHER clients in the same room.
 * Rooms are garbage-collected when the last client leaves.
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 4000;

// rooms: Map<roomCode, Map<ws, playerInfo>>
const rooms = new Map();

const httpServer = createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            rooms: [...rooms.entries()].map(([code, players]) => ({
                code,
                clients: players.size,
            })),
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomCode = url.searchParams.get('room')?.toUpperCase();

    if (!roomCode) {
        ws.close(1008, 'Missing room parameter');
        return;
    }

    if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
    const playersMap = rooms.get(roomCode);

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());

            // Handle Join logic
            if (msg.type === 'JOIN') {
                const playerInfo = {
                    id: msg.playerId,
                    name: msg.playerName,
                    color: msg.playerColor,
                };
                playersMap.set(ws, playerInfo);

                console.log(`[+] ${playerInfo.name} joined "${roomCode}"`);

                // 1. Tell the new person about existing players
                const existingMembers = Array.from(playersMap.values()).filter(p => p.id !== playerInfo.id);
                ws.send(JSON.stringify({ type: 'SYNC_MEMBERS', members: existingMembers }));

                // 2. Tell everyone else about the new person
                broadcastToRoom(roomCode, ws, { type: 'MEMBER_ADDED', member: playerInfo });
                return;
            }

            // Standard Relay
            broadcastToRoom(roomCode, ws, msg);

        } catch (e) {
            console.error('[Relay Error]', e);
        }
    });

    ws.on('close', () => {
        const playerInfo = playersMap.get(ws);
        if (playerInfo) {
            console.log(`[-] ${playerInfo.name} left "${roomCode}"`);
            broadcastToRoom(roomCode, ws, { type: 'MEMBER_REMOVED', playerId: playerInfo.id });
        }
        playersMap.delete(ws);
        if (playersMap.size === 0) rooms.delete(roomCode);
    });
});

function broadcastToRoom(roomCode, senderWs, msg) {
    const playersMap = rooms.get(roomCode);
    if (!playersMap) return;

    const raw = JSON.stringify(msg);
    for (const client of playersMap.keys()) {
        if (client !== senderWs && client.readyState === 1) {
            client.send(raw);
        }
    }
}

httpServer.listen(PORT, () => {
    console.log(`\n🚀 Board Game Server running on port ${PORT}`);
});
