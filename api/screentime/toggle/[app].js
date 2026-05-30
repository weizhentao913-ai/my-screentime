// Vercel Serverless Function
// 每次iPhone快捷指令触发时，记录app的打开/关闭

// 用内存模拟存储（Vercel免费版没有持久存储，建议后续换成Vercel KV或Upstash Redis）
// 这里先用一个简单的JSON文件方案

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { app } = req.query;
  
  if (!app) {
    return res.status(400).json({ error: 'Missing app name' });
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10); // "2026-05-31"
  const key = `screentime:${today}`;

  try {
    // 获取今天的记录
    let records = await kv.get(key) || [];

    // 判断这个app当前是open还是close
    const lastRecord = [...records].reverse().find(r => r.app === app);
    const action = (!lastRecord || lastRecord.action === 'close') ? 'open' : 'close';

    // 添加新记录
    records.push({ app, action, time: now });

    // 存储，设置48小时过期
    await kv.set(key, records, { ex: 172800 });

    return res.status(200).json({ ok: true, app, action, time: now });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
