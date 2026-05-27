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
    const { mood, energy, vibe, lang, genre, era, format } = req.body;

    const isPlaylist = format === 'playlist';

    const prompt = isPlaylist
      ? `אתה מומחה מוזיקה עולמי עם טעם מצוין ומגוון.
המשתמש מחפש פלייליסט שמתאים ל:
- תקופה: ${era}
- מצב רוח: ${mood}
- אנרגיה: ${energy}
- מה רוצה לקבל: ${vibe}
- שפה מועדפת: ${lang}
- סגנון מועדף: ${genre}

תן שם פלייליסט שיהיה קל למצוא ביוטיוב — משהו פופולרי שבטוח קיים. למשל "80s rock playlist", "90s hip hop classics", "chill lofi playlist", "best reggae songs".
חשוב: youtube_query חייב להיות מונח חיפוש קצר באנגלית עם המילה "playlist" בסוף.
החזר JSON תקין בלבד, ללא טקסט נוסף וללא markdown:
{"song":"שם הפלייליסט בעברית","artist":"תיאור קצר (למשל: אוסף קלאסיקות)","year":"${era}","reason":"משפט אחד קצר בעברית למה הפלייליסט הזה מתאים לרגע הזה","youtube_query":"playlist search query in English","is_playlist":true}`
      : `אתה מומחה מוזיקה עולמי עם טעם מצוין ומגוון.
המשתמש ענה על שאלון מצב רוח:
- תקופה: ${era}
- מצב רוח: ${mood}
- אנרגיה: ${energy}
- מה רוצה לקבל: ${vibe}
- שפה מועדפת: ${lang}
- סגנון מועדף: ${genre}

המלץ על שיר אחד שמתאים בדיוק לתקופה ולסגנון. גוון בין שירים מוכרים לפחות מוכרים, אל תחזור על אותם להיטים שוחקים.
חשוב: youtube_query צריך להיות שם השיר + שם האמן באנגלית בלבד, "Artist Song Name", בלי מילים נוספות.
החזר JSON תקין בלבד, ללא טקסט נוסף וללא markdown:
{"song":"שם השיר","artist":"שם האמן","year":"שנה","reason":"משפט אחד קצר בעברית למה השיר הזה מתאים לרגע הזה","youtube_query":"Artist Song Name","is_playlist":false}`;

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

    // Find YouTube video/playlist ID by scraping search results
    try {
      const ytQuery = encodeURIComponent(result.youtube_query || `${result.song} ${result.artist}`);
      const ytRes = await fetch(`https://www.youtube.com/results?search_query=${ytQuery}`);
      const ytHtml = await ytRes.text();

      if (result.is_playlist) {
        const plMatch = ytHtml.match(/"playlistId":"([a-zA-Z0-9_-]+)"/);
        if (plMatch) {
          result.playlist_id = plMatch[1];
        } else {
          // fallback to a video if no playlist found
          const vidMatch = ytHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (vidMatch) result.video_id = vidMatch[1];
        }
      } else {
        const match = ytHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match) result.video_id = match[1];
      }
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
