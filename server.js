require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Routes
app.get('/', (req, res) => {
    res.send(`
    <html>
        <head><title>Discord OAuth Example</title></head>
        <body>
            ${req.session.user ? `
                <h1>Welcome ${req.session.user.username}#${req.session.user.discriminator}</h1>
                <p>ID: ${req.session.user.id}</p>
                <p>Email: ${req.session.user.email}</p>
                <p>Access Token: ${req.session.accessToken}</p>
                <a href="/logout">Logout</a>
            ` : `
                <a href="/auth/discord">Login with Discord</a>
            `}
        </body>
    </html>
    `);
});

app.get('/auth/discord', (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email`;
    res.redirect(url);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.sendStatus(400);

    try {
        // Exchange code for access token
        const params = new URLSearchParams();
        params.append('client_id', process.env.DISCORD_CLIENT_ID);
        params.append('client_secret', process.env.DISCORD_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', process.env.DISCORD_REDIRECT_URI);
        params.append('scope', 'identify email');

        const response = await axios.post('https://discord.com/api/oauth2/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token } = response.data;

        // Get user data
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        // Store user session
        req.session.user = userResponse.data;
        req.session.accessToken = access_token;
        res.redirect('/');
    } catch (error) {
        console.error('OAuth error:', error);
        res.sendStatus(500);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
