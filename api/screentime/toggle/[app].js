function getBeijingDate() {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return { date: beijing.toISOString().slice(0, 10), time: beijing.toISOString() };
}

export default async function handler(req, res) {
  const { app } = req.query;

  if (!app) {
    return res.status(400).json({ error: 'Missing app name' });
  }

  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'KV not configured' });
  }

  const { date: today, time: now } = getBeijingDate();
  const key = `screentime:${today}`;

  try {
    const getRes = await fetch(`${KV_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const getData = await getRes.json();
    let records = [];
    if (getData.result) {
      records = JSON.parse(getData.result);
    }

    const lastRecord = [...records].reverse().find(r => r.app === app);
    const action = (!lastRecord || lastRecord.action === 'close') ? 'open' : 'close';

    records.push({ app, action, time: now });

    await fetch(`${KV_URL}/set/${key}/${encodeURIComponent(JSON.stringify(records))}/ex/172800`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });

    return res.status(200).json({ ok: true, app, action, time: now });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
