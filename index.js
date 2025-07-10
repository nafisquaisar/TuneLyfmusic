const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
console.log("🚀 Script started");

app.get('/audius-search', async (req, res) => {
    const artist = req.query.artist;
    const offset = parseInt(req.query.offset || '0');
    const limit = parseInt(req.query.limit || '10');

    if (!artist) {
        return res.status(400).json({ error: 'Artist name is required' });
    }

    try {
        const response = await axios.get(`https://discoveryprovider.audius.co/v1/tracks/search`, {
            params: {
                query: artist,
                limit: 100 // Get more and slice manually below
            }
        });

        const fullResults = response.data?.data || [];

        // Optional: Filter tracks where artist name matches
        const filtered = fullResults.filter(track =>
            track.user?.name?.toLowerCase().includes(artist.toLowerCase())
        );

        const paginated = filtered.slice(offset, offset + limit);

        res.json({ data: paginated });

    } catch (error) {
        if (error.response) {
            console.error("❌ Audius API responded with status:", error.response.status);
            console.error("🔻 Response body:", error.response.data);
        } else if (error.request) {
            console.error("⚠️ No response received. Request was sent, but no reply.");
            console.error("📦 Request object:", error.request);
        } else {
            console.error("❌ Unknown error:", error.message);
        }

        res.status(500).json({ error: 'Failed to fetch from Audius' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy Server running on http://localhost:${PORT}`);
});
