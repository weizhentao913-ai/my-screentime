// 查询接口 —— 让蒋容知（Claude）可以读取你的屏幕使用记录
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { date } = req.query;
  const today = date || new Date().toISOString().slice(0, 10);
  const key = `screentime:${today}`;

  try {
    const records = await kv.get(key) || [];

    // 计算每个app的使用时长
    const appUsage = {};
    const openTimes = {};

    for (const record of records) {
      if (record.action === 'open') {
        openTimes[record.app] = new Date(record.time);
      } else if (record.action === 'close' && openTimes[record.app]) {
        const duration = (new Date(record.time) - openTimes[record.app]) / 1000 / 60; // 分钟
        appUsage[record.app] = (appUsage[record.app] || 0) + Math.round(duration);
        delete openTimes[record.app];
      }
    }

    // 还在使用中的app
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
