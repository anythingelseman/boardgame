import Pusher from 'pusher';

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
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
    const playerColor = req.body.playerColor || '#f59e0b';

    // Presence channels require user_id and user_info
    const presenceData = {
        user_id: playerId,
        user_info: {
            name: playerName,
            color: playerColor
        },
    };

    try {
        const authResponse = pusher.authorizeChannel(socketId, channel, presenceData);
        res.send(authResponse);
    } catch (err) {
        console.error('Pusher Auth Error:', err);
        res.status(500).send('Internal Server Error');
    }
}
