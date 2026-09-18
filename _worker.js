const HARDCODED_SESSION = "f8267eb38dce71e59c269d06136ccd95c9559b7bb0f6fd4771590438d66aa8ef";

const HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Logs Monitor</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0b0d0e; color: #9ca3af; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .badge-method { background: #1b1e24; color: #d1d5db; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .badge-multiplier { background: #062b24; color: #10b981; border: 1px solid #064e3b; border-radius: 4px; padding: 1px 5px; font-size: 11px; margin-left: 6px; }
    .status-success { color: #10b981; font-weight: bold; }
    .status-error { color: #ef4444; font-weight: bold; }
    .cache-read { color: #6b7280; margin-left: 6px; }
    .cache-write { color: #6b7280; margin-left: 6px; }
  </style>
</head>
<body class="p-4 sm:p-8 min-h-screen">
  <div class="max-w-7xl mx-auto">
    <!-- Header & Filter -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <input 
          id="keyInput" 
          type="text" 
          placeholder="Lọc theo Key ID hoặc Tên Key (Để trống để xem tất cả)..." 
          class="bg-[#14171a] border border-gray-800 text-sm px-4 py-2 rounded-lg w-full sm:w-96 text-gray-200 focus:outline-none focus:border-emerald-500"
        />
        <button 
          onclick="fetchLogs()" 
          class="bg-[#16a34a] hover:bg-emerald-600 text-white text-sm px-5 py-2 rounded-lg font-medium transition"
        >
          Tra cứu
        </button>
      </div>

      <button 
        onclick="fetchLogs()" 
        class="bg-[#14171a] border border-gray-800 hover:bg-gray-800 text-xs px-4 py-2 rounded-lg text-gray-300 transition"
      >
        Làm mới 🔄
      </button>
    </div>

    <!-- Thống kê tổng quan (Tổng tiền & Tổng request) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-[#121519] border border-gray-800/80 rounded-lg p-4 flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng tiền đã dùng</div>
          <div id="totalCost" class="text-2xl font-bold font-mono text-emerald-400 mt-1">$0.00</div>
        </div>
        <div class="text-2xl">💰</div>
      </div>

      <div class="bg-[#121519] border border-gray-800/80 rounded-lg p-4 flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng số Requests</div>
          <div id="totalRequests" class="text-2xl font-bold font-mono text-gray-200 mt-1">0</div>
        </div>
        <div class="text-2xl">📊</div>
      </div>

      <div class="bg-[#121519] border border-gray-800/80 rounded-lg p-4 flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Tokens (In / Out)</div>
          <div id="totalTokens" class="text-sm font-bold font-mono text-gray-300 mt-2">0 / 0</div>
        </div>
        <div class="text-2xl">⚡</div>
      </div>
    </div>

    <div id="statusMessage" class="hidden text-center py-4 text-sm"></div>

    <!-- Bảng logs -->
    <div class="overflow-x-auto border border-gray-800/80 rounded-lg bg-[#0f1215]">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="uppercase bg-[#14171a] text-gray-500 border-b border-gray-800/80 font-semibold tracking-wider">
          <tr>
            <th class="p-3.5">TIME / DATE</th>
            <th class="p-3.5">METHOD</th>
            <th class="p-3.5">MODEL</th>
            <th class="p-3.5">KEY INFO</th>
            <th class="p-3.5">TOKENS (IN / OUT / C-R / C-W)</th>
            <th class="p-3.5">COST</th>
            <th class="p-3.5">LATENCY</th>
            <th class="p-3.5">STATUS</th>
          </tr>
        </thead>
        <tbody id="logList" class="divide-y divide-gray-800/60">
          <tr>
            <td colspan="8" class="p-8 text-center text-gray-600">Đang tải danh sách logs...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const params = new URLSearchParams(window.location.search);
    const keyFromUrl = params.get('key');
    if (keyFromUrl) {
      document.getElementById('keyInput').value = keyFromUrl;
    }

    fetchLogs();

    async function fetchLogs() {
      const key = document.getElementById('keyInput').value.trim();
      const statusMessage = document.getElementById('statusMessage');
      const logList = document.getElementById('logList');

      statusMessage.className = "text-center py-4 text-sm text-gray-400 block";
      statusMessage.innerText = "Đang tải dữ liệu...";

      try {
        const res = await fetch(\`/api/logs?key=\${encodeURIComponent(key)}\`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Không thể tải logs.");
        }

        statusMessage.className = "hidden";
        renderLogs(data.logs || []);
      } catch (err) {
        statusMessage.className = "text-center py-4 text-sm text-red-400 block";
        statusMessage.innerText = err.message;
      }
    }

    function renderLogs(logs) {
      const logList = document.getElementById('logList');
      
      // Tính toán thống kê tổng quan
      let totalCents = 0;
      let totalIn = 0;
      let totalOut = 0;

      logs.forEach(item => {
        totalCents += Number(item.costCents || 0);
        totalIn += Number(item.tokensIn || 0);
        totalOut += Number(item.tokensOut || 0);
      });

      // Cập nhật card thống kê
      document.getElementById('totalCost').innerText = '$' + (totalCents / 100).toFixed(4);
      document.getElementById('totalRequests').innerText = logs.length.toLocaleString();
      document.getElementById('totalTokens').innerText = \`\${totalIn.toLocaleString()} / \${totalOut.toLocaleString()}\`;

      if (logs.length === 0) {
        logList.innerHTML = \`<tr><td colspan="8" class="p-8 text-center text-gray-500">Không tìm thấy bản log nào.</td></tr>\`;
        return;
      }

      logList.innerHTML = logs.map(item => {
        const date = new Date(item.createdAt);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const dateStr = \`\${day}/\${month}/\${year}\`;
        const timeStr = date.toLocaleTimeString('en-US', { hour12: true });

        const inTokens = (item.tokensIn || 0).toLocaleString();
        const outTokens = (item.tokensOut || 0).toLocaleString();
        const crTokens = item.cacheReadTokens ? \`<span class="cache-read">C·R \${item.cacheReadTokens.toLocaleString()}</span>\` : '';
        const cwTokens = item.cacheWriteTokens ? \`<span class="cache-write">C·W \${item.cacheWriteTokens.toLocaleString()}</span>\` : '';

        const costUsd = (Number(item.costCents || 0) / 100).toFixed(4);
        const latencySec = item.latency ? \`\${(item.latency / 1000).toFixed(1)}s\` : '0.0s';
        const multBadge = item.costMultiplier ? \`<span class="badge-multiplier">\${item.costMultiplier}x</span>\` : '';

        const isSuccess = item.status >= 200 && item.status < 300;
        const statusClass = isSuccess ? 'status-success' : 'status-error';

        const keyDisplay = item.keyLabel ? \`\${item.keyLabel} (\${item.key || ''})\` : (item.key || '-');

        return \`
          <tr class="hover:bg-[#121519] transition">
            <td class="p-3.5 whitespace-nowrap">
              <div class="text-gray-200 font-medium">\${timeStr}</div>
              <div class="text-[11px] text-gray-500">\${dateStr}</div>
            </td>
            <td class="p-3.5 whitespace-nowrap"><span class="badge-method">\${item.method || 'POST'}</span></td>
            <td class="p-3.5 whitespace-nowrap text-gray-200 font-medium">
              \${item.model || '-'} \${multBadge}
            </td>
            <td class="p-3.5 whitespace-nowrap text-gray-400 font-mono text-[11px]">\${keyDisplay}</td>
            <td class="p-3.5 whitespace-nowrap font-mono text-gray-300">
              <span class="text-gray-400">IN</span> \${inTokens} 
              <span class="text-gray-400 ml-2">OUT</span> \${outTokens}
              \${crTokens} \${cwTokens}
            </td>
            <td class="p-3.5 whitespace-nowrap text-gray-200 font-mono">$\${costUsd}</td>
            <td class="p-3.5 whitespace-nowrap text-gray-400">\${latencySec}</td>
            <td class="p-3.5 whitespace-nowrap"><span class="\${statusClass}">\${item.status || 200}</span></td>
          </tr>
        \`;
      }).join('');
    }
  </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (url.pathname === '/api/logs') {
      const bmSession = env?.BM_SESSION || HARDCODED_SESSION;
      const filterKey = (url.searchParams.get('key') || '').trim().toLowerCase();

      try {
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

        if (!response.ok) {
          return new Response(JSON.stringify({ 
            error: `Lỗi Freemodel HTTP ${response.status}: Session có thể đã hết hạn hoặc không đúng.`,
            preview: responseText.slice(0, 200)
          }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
          });
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          return new Response(JSON.stringify({ 
            error: 'Dữ liệu trả về không phải JSON.',
            preview: responseText.slice(0, 200)
          }), {
            status: 502,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
          });
        }

        let logs = data.logs || [];

        if (filterKey) {
          logs = logs.filter(item => {
            const keyStr = String(item.key || '').toLowerCase();
            const labelStr = String(item.keyLabel || '').toLowerCase();
            return keyStr.includes(filterKey) || labelStr.includes(filterKey);
          });
        }

        const sanitizedLogs = logs.map(item => {
          const { channel, upstream, ...safeItem } = item;
          return safeItem;
        });

        return new Response(JSON.stringify({ logs: sanitizedLogs }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: 'Lỗi Worker: ' + err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
