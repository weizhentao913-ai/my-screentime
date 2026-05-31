function getBeijingDate() {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijing.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  const { date } = req.query;
  const today = date || getBeijingDate();
  const key = `screentime:${today}`;

  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'KV not configured' });
  }

  try {
    const getRes = await fetch(`${KV_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const getData = await getRes.json();
    let records = [];
    if (getData.result) {
      records = JSON.parse(getData.result);
    }

    const appUsage = {};
    const openTimes = {};

    for (const record of records) {
      if (record.action === 'open') {
        openTimes[record.app] = new Date(record.time);
      } else if (record.action === 'close' && openTimes[record.app]) {
        const duration = (new Date(record.time) - openTimes[record.app]) / 1000 / 60;
        appUsage[record.app] = (appUsage[record.app] || 0) + Math.round(duration);
        delete openTimes[record.app];
      }
    }

    for (const [app, openTime] of Object.entries(openTimes)) {
      const duration = (new Date() - openTime) / 1000 / 60;
      appUsage[app] = (appUsage[app] || 0) + Math.round(duration);
    }

    return res.status(200).json({
      date: today,
      usage: appUsage,
      raw: records
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
