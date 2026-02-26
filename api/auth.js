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

    // In a real app, you'd verify the user's session here.
    // For a sandbox, we'll allow anyone to join the channel they request.
    const authResponse = pusher.authorizeChannel(socketId, channel);
    res.send(authResponse);
}
