export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bmSession = process.env.BM_SESSION;
  if (!bmSession) {
    return res.status(500).json({ error: 'Chưa cấu hình BM_SESSION trên Vercel Environment Variables.' });
  }

  const filterKey = (req.query.key || '').trim().toLowerCase();

  try {
    const response = await fetch('https://freemodel.dev/api/logs', {
      method: 'GET',
      headers: {
        'Cookie': `bm_session=${bmSession}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Lỗi kết nối freemodel (${response.status}): Session có thể đã hết hạn.` 
      });
    }

    const data = await response.json();
    let logs = data.logs || [];

    // Nếu có truyền key thì lọc theo key hoặc keyLabel
    if (filterKey) {
      logs = logs.filter(item => {
        const keyMatch = item.key && String(item.key).toLowerCase() === filterKey;
        const labelMatch = item.keyLabel && String(item.keyLabel).toLowerCase() === filterKey;
        return keyMatch || labelMatch;
      });
    }

    // Bảo mật: Xóa channel gốc và thông tin upstream nhạy cảm
    const sanitizedLogs = logs.map(item => {
      const { channel, upstream, ...safeItem } = item;
      return safeItem;
    });

    return res.status(200).json({ logs: sanitizedLogs });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi server: ' + err.message });
  }
}
