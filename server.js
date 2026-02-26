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

const PORT = 4000;

// rooms: Map<roomCode, Set<WebSocket>>
const rooms = new Map();

const httpServer = createServer((req, res) => {
    // Simple health-check endpoint
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            rooms: [...rooms.entries()].map(([code, clients]) => ({
                code,
                clients: clients.size,
            })),
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
    // Parse room code from query string: ws://localhost:4000?room=ABCD12
    const url = new URL(req.url, 'http://localhost');
    const room = url.searchParams.get('room')?.toUpperCase();

    if (!room) {
        ws.close(1008, 'Missing room parameter');
        return;
    }

    // Join room
    if (!rooms.has(room)) rooms.set(room, new Set());
    const roomClients = rooms.get(room);
    roomClients.add(ws);

    console.log(`[+] Client joined room "${room}" (${roomClients.size} total)`);

    ws.on('message', (data, isBinary) => {
        // Relay raw message to every OTHER client in the same room
        let count = 0;
        const msgStr = data.toString();
        try {
            const parsed = JSON.parse(msgStr);
            console.log(`[relay] Received "${parsed.type}" from client in "${room}"`);
        } catch (e) {
            console.log(`[relay] Received raw data from client in "${room}"`);
        }

        for (const client of roomClients) {
            if (client !== ws && client.readyState === 1 /* OPEN */) {
                client.send(data, { binary: isBinary });
                count++;
            }
        }
        if (count > 0) {
            console.log(`[relay] Relayed msg to ${count} peer(s) in "${room}"`);
        }
    });

    ws.on('close', () => {
        roomClients.delete(ws);
        console.log(`[-] Client left room "${room}" (${roomClients.size} remaining)`);
        if (roomClients.size === 0) {
            rooms.delete(room);
            console.log(`[x] Room "${room}" closed`);
        }
    });

    ws.on('error', (err) => {
        console.error(`[!] WS error in room "${room}":`, err.message);
        roomClients.delete(ws);
    });
});

httpServer.listen(PORT, () => {
    console.log(`\n🎲 BoardSandbox relay server running on ws://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
