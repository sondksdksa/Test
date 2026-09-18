export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Kiểm tra biến môi trường
  const bmSession = env.BM_SESSION;
  if (!bmSession) {
    return new Response(JSON.stringify({ 
      error: 'Chưa cấu hình biến BM_SESSION trên Cloudflare Settings -> Environment variables.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const filterKey = (url.searchParams.get('key') || '').trim().toLowerCase();

  try {
    // 2. Gửi request với đầy đủ Headers giống Chrome
    const response = await fetch('https://freemodel.dev/api/logs', {
      method: 'GET',
      headers: {
        'Cookie': `bm_session=${bmSession.trim()}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        'Referer': 'https://freemodel.dev/',
        'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      }
    });

    const responseText = await response.text();

    // 3. Nếu server trả về mã lỗi HTTP
    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: `Freemodel trả về lỗi HTTP ${response.status}. Có thể cookie bm_session đã hết hạn hoặc không đúng.`,
        raw: responseText.slice(0, 300)
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 4. Kiểm tra xem nội dung trả về có phải JSON không
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Freemodel không trả về dữ liệu JSON hợp lệ. Vui lòng kiểm tra lại cookie bm_session.',
        preview: responseText.slice(0, 300)
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    let logs = data.logs || [];

    // 5. Lọc theo key nếu người dùng có nhập
    if (filterKey) {
      logs = logs.filter(item => {
        const keyMatch = item.key && String(item.key).toLowerCase() === filterKey;
        const labelMatch = item.keyLabel && String(item.keyLabel).toLowerCase() === filterKey;
        return keyMatch || labelMatch;
      });
    }

    // 6. Xóa các trường nhạy cảm
    const sanitizedLogs = logs.map(item => {
      const { channel, upstream, ...safeItem } = item;
      return safeItem;
    });

    return new Response(JSON.stringify({ logs: sanitizedLogs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Lỗi server Cloudflare: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
