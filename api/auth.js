import Pusher from 'pusher';

const pusher = new Pusher({
    appId: "2120731",
    key: "ac8b4537a8529842be77",
    secret: "dd1e10d991c787a2ade6",
    cluster: "ap1",
    useTLS: true,
});

export default async function handler(req, res) {
    // Simple CORS for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;
    const playerId = req.body.playerId || 'anon';
    const playerName = req.body.playerName || 'Player';

    // Presence channels require user_id and user_info
    const presenceData = {
        user_id: playerId,
        user_info: { name: playerName },
    };

    try {
        const authResponse = pusher.authorizeChannel(socketId, channel, presenceData);
        res.send(authResponse);
    } catch (err) {
        console.error('Pusher Auth Error:', err);
        res.status(500).send('Internal Server Error');
    }
}
