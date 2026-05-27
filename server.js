// Mood Music Bot — Render server
// Proxies requests to OpenAI so the API key stays on the server

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_API_KEY;

app.get('/', (req, res) => {
  res.send('Mood Music Bot server is running 🎵');
});

app.post('/recommend', async (req, res) => {
  try {
    const { mood, energy, vibe, lang, genre } = req.body;

    const prompt = `אתה מומחה מוזיקה עולמי עם טעם מצוין ומגוון.
המשתמש ענה על שאלון מצב רוח:
- מצב רוח: ${mood}
- אנרגיה: ${energy}
- מה רוצה לקבל: ${vibe}
- שפה מועדפת: ${lang}
- סגנון מועדף: ${genre}

המלץ על שיר אחד שמתאים בדיוק. גוון בין שירים מוכרים לפחות מוכרים, אל תחזור על אותם להיטים שוחקים.
חשוב: youtube_query צריך להיות שם השיר + שם האמן באנגלית בלבד, בלי מילה "official" או "video", פשוט "Artist Song Name", כדי שנוכל לחפש בקלות ביוטיוב.
החזר JSON תקין בלבד, ללא טקסט נוסף וללא markdown:
{"song":"שם השיר","artist":"שם האמן","year":"שנה","reason":"משפט אחד קצר בעברית למה השיר הזה מתאים לרגע הזה","youtube_query":"Artist Song Name"}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.1,
        max_tokens: 300
      })
    });

    const data = await response.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);

    // Find YouTube video ID by scraping search results
    try {
      const ytQuery = encodeURIComponent(result.youtube_query || `${result.song} ${result.artist}`);
      const ytRes = await fetch(`https://www.youtube.com/results?search_query=${ytQuery}`);
      const ytHtml = await ytRes.text();
      const match = ytHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (match) result.video_id = match[1];
    } catch(e) {
      console.error('YouTube search failed:', e);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
