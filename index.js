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
        limit: 10
    },
    headers: {
        'User-Agent': 'TuneLyfApp/1.0 (dev build)'
    }
});



        const fullResults = response.data?.data || [];

        // ✅ Improved filtering: match artist in title or uploader name
        const artistLower = artist.toLowerCase();
        const filtered = fullResults.filter(track => {
            const artistName = (track.user?.name || '').toLowerCase();
            const title = (track.title || '').toLowerCase();
            const genre = (track.genre || '').toLowerCase();
            const desc = (track.description || '').toLowerCase();
            const tagsArray = Array.isArray(track.tags) ? track.tags : [];
            const tags = tagsArray.join(',').toLowerCase();

            const query = artist.toLowerCase();

            return (
                artistName.includes(query) ||
                title.includes(query) ||
                genre.includes(query) ||
                desc.includes(query) ||
                tags.includes(query)
            );
        });



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

app.get('/audius-stream', async (req, res) => {
    const trackId = req.query.trackId;

    if (!trackId) {
        return res.status(400).json({ error: 'trackId is required' });
    }

    try {
        const response = await axios.get(`https://discoveryprovider.audius.co/v1/tracks/${trackId}/stream`, {
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400
        });

        const redirectUrl = response.headers.location;

        if (redirectUrl) {
            res.json({ streamUrl: redirectUrl });
        } else {
            res.status(500).json({ error: 'Stream URL not found' });
        }

    } catch (error) {
        console.error("❌ Error getting stream URL:", error.message);
        res.status(500).json({ error: 'Failed to get stream URL' });
    }
});


app.get('/audius-trending', async (req, res) => {
    const limit = parseInt(req.query.limit || '20');

    try {
        const response = await axios.get(
            'https://discoveryprovider.audius.co/v1/tracks/trending',
            {
                params: {
                    limit: limit * 2, // 👈 buffer for filtering
                    time: 'week'
                },
                headers: {
                    'User-Agent': 'TuneLyfApp/1.0'
                }
            }
        );

        const raw = response.data?.data || [];

        // ✅ FILTER NON-STREAMABLE
        const streamable = raw.filter(track =>
            track.is_streamable === true &&
            track.is_delete === false
        );

        // ✅ RETURN ONLY REQUIRED COUNT
        res.json({
            data: streamable.slice(0, limit)
        });

    } catch (err) {
        console.error('❌ Trending fetch failed:', err.message);
        res.status(500).json({ error: 'Trending fetch failed' });
    }
});



app.listen(PORT, () => {
    console.log(`✅ Proxy Server running on http://localhost:${PORT}`);
});
