const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
console.log("🚀 TuneLyf Proxy Started");

/* ---------------- CONFIG ---------------- */

const MIN_DURATION = 60;    // 1 min
const MAX_DURATION = 360;   // 6 min

const HINDI_KEYWORDS = [
  'hindi','bollywood','desi','india','indian',
  'romantic','sad','love','filmi','ghazal',
  'arijit','shreya','atif','jubin','neha',
  'kk','sonu','udit','alka','armaan',
  'badshah','raftaar','honey singh','diljit'
];

function isHindiTrack(track) {
    const title = (track.title || '').toLowerCase();
    const artist = (track.user?.name || '').toLowerCase();
    const genre = (track.genre || '').toLowerCase();
    const desc = (track.description || '').toLowerCase();
    const tags = Array.isArray(track.tags)
        ? track.tags.join(',').toLowerCase()
        : '';

    const combined = `${title} ${artist} ${genre} ${desc} ${tags}`;
    return HINDI_KEYWORDS.some(word => combined.includes(word));
}

/* ---------------- NEW SONGS (HOME) ---------------- */

app.get('/audius-new', async (req, res) => {
    const limit = parseInt(req.query.limit || '20');

    try {
        const response = await axios.get(
            'https://discoveryprovider.audius.co/v1/tracks/search',
            {
                params: {
                    query: 'song',
                    sort: 'recent',
                    limit: limit * 3
                },
                headers: { 'User-Agent': 'TuneLyfApp/1.0' }
            }
        );

        const raw = response.data?.data || [];

        const hindiPlayable = raw.filter(track =>
            track.is_streamable === true &&
            track.is_delete === false &&
            track.duration >= MIN_DURATION &&
            track.duration <= MAX_DURATION &&
            isHindiTrack(track)
        );

        console.log("🎵 Hindi New Songs:", hindiPlayable.length);

        res.json({ data: hindiPlayable.slice(0, limit) });

    } catch (e) {
        console.error("❌ New Hindi fetch failed:", e.message);
        res.status(500).json({ error: 'Failed to fetch new Hindi songs' });
    }
});

/* ---------------- SEARCH (HINDI ONLY) ---------------- */

app.get('/audius-search', async (req, res) => {
    const query = req.query.artist;
    const offset = parseInt(req.query.offset || '0');
    const limit = parseInt(req.query.limit || '10');

    if (!query) {
        return res.status(400).json({ error: 'Query required' });
    }

    try {
        const response = await axios.get(
            'https://discoveryprovider.audius.co/v1/tracks/search',
            {
                params: { query, limit: 50 },
                headers: { 'User-Agent': 'TuneLyfApp/1.0' }
            }
        );

        const raw = response.data?.data || [];

        const hindiFiltered = raw.filter(track =>
            track.is_streamable === true &&
            track.is_delete === false &&
            track.duration >= MIN_DURATION &&
            track.duration <= MAX_DURATION &&
            isHindiTrack(track)
        );

        res.json({
            data: hindiFiltered.slice(offset, offset + limit)
        });

    } catch (e) {
        console.error("❌ Search failed:", e.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

/* ---------------- STREAM URL ---------------- */

app.get('/audius-stream', async (req, res) => {
    const trackId = req.query.trackId;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });

    try {
        const response = await axios.get(
            `https://discoveryprovider.audius.co/v1/tracks/${trackId}/stream`,
            {
                maxRedirects: 0,
                validateStatus: s => s >= 200 && s < 400
            }
        );

        const redirectUrl = response.headers.location;
        if (redirectUrl) {
            res.json({ streamUrl: redirectUrl });
        } else {
            res.status(404).json({ error: 'Stream not found' });
        }

    } catch (e) {
        console.error("❌ Stream error:", e.message);
        res.status(500).json({ error: 'Stream failed' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy running on port ${PORT}`);
});


app.listen(PORT, () => {
    console.log(`✅ Proxy Server running on http://localhost:${PORT}`);
});
