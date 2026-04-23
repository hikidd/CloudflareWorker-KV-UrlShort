// Cloudflare Worker
// This worker uses Cloudflare KV for storing URL data

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const { pathname } = url;

    // Handle favicon request
    if (pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    if (pathname === "/") {
      // Serve the frontend
      return serveFrontend();
    }

    if (pathname.startsWith("/api")) {
      // Handle API requests
      return handleAPIRequest(request);
    }

    // Redirect for short URLs
    return handleRedirect(pathname);
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response('服务器内部错误', { status: 500 });
  }
}

async function serveFrontend() {
  const frontendHTML = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>短链接生成器</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔗</text></svg>">
</head>
<body class="min-h-screen bg-gray-50 text-gray-900">
    <main class="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div class="mx-auto mb-8 w-full max-w-5xl">
            <div class="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div class="max-w-2xl">
                    <h1 class="text-4xl font-semibold tracking-tight text-black sm:text-5xl">U短链</h1>
                    <p class="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
                        更轻、更快、更克制，把长链接整理成干净好用的分享入口。
                    </p>
                </div>
                <a href="https://github.com/hikidd/CloudflareWorker-KV-UrlShort"
                   target="_blank"
                   rel="noreferrer"
                   class="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
                    <svg class="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"></path>
                    </svg>
                    GITHUB
                </a>
            </div>
        </div>

        <div class="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-3">
            <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-2">
                <div class="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm font-semibold text-gray-900">创建短链接</p>
                        <p class="mt-1 text-sm text-gray-500">输入目标地址，可选设置自定义后缀、有效期、密码和访问次数。</p>
                    </div>
                </div>

                <form id="shorten-form" class="space-y-5">
                    <div>
                        <label for="url" class="mb-2 block text-sm font-medium text-gray-700">
                            输入链接
                            <span class="font-normal text-gray-400">（必填）</span>
                        </label>
                        <input id="url" type="url"
                            class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
                            placeholder="https://example.com" required>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label for="slug" class="mb-2 block text-sm font-medium text-gray-700">
                                自定义短链接
                                <span class="font-normal text-gray-400">（可选）</span>
                            </label>
                            <input id="slug" type="text"
                                class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                placeholder="自定义链接">
                        </div>
                        <div>
                            <label for="expiry" class="mb-2 block text-sm font-medium text-gray-700">
                                有效期
                                <span class="font-normal text-gray-400">（可选）</span>
                            </label>
                            <select id="expiry"
                                class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200">
                                <option value="">永久有效</option>
                                <option value="1h">1小时</option>
                                <option value="24h">24小时</option>
                                <option value="7d">7天</option>
                                <option value="30d">30天</option>
                                <option value="custom">自定义时间</option>
                            </select>
                            <input id="customExpiry" type="datetime-local"
                                class="mt-2 hidden w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200">
                        </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label for="password" class="mb-2 block text-sm font-medium text-gray-700">
                                访问密码
                                <span class="font-normal text-gray-400">（可选）</span>
                            </label>
                            <input id="password" type="password"
                                class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                placeholder="设置密码">
                        </div>
                        <div>
                            <label for="maxVisits" class="mb-2 block text-sm font-medium text-gray-700">
                                最大访问次数
                                <span class="font-normal text-gray-400">（可选）</span>
                            </label>
                            <input id="maxVisits" type="number"
                                class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                placeholder="10">
                        </div>
                    </div>

                    <button type="submit"
                        class="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2">
                        生成短链接
                    </button>
                </form>

                <div id="result" class="mt-6"></div>
            </section>

            <aside class="space-y-4">
                <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-widest text-gray-500">真相只有一个</p>
                    <h2 class="mt-3 text-lg font-semibold text-gray-900">再复杂的链接，也能一键化繁为简</h2>
                    <p class="mt-2 text-sm leading-6 text-gray-600">保留单文件结构，不新增依赖、不需要构建，直接粘贴到 Cloudflare Worker 后台测试。</p>
                </div>
                <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-widest text-gray-500">支持能力</p>
                    <div class="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-700">
                        <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">密码保护</div>
                        <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">有效期</div>
                        <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">访问限制</div>
                        <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">自定义短链</div>
                    </div>
                </div>
            </aside>
        </div>
    </main>

    <script>
    document.getElementById('shorten-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitButton = e.target.querySelector('button[type="submit"]');
      const resultDiv = document.getElementById('result');

      submitButton.disabled = true;
      submitButton.textContent = '生成中...';
      resultDiv.innerHTML = '';

      try {
        const expiry = document.getElementById('expiry').value;
        let expiryDate = null;

        if (expiry) {
          const now = new Date();
          switch (expiry) {
            case '1h':
              expiryDate = new Date(now.getTime() + 60 * 60 * 1000);
              break;
            case '24h':
              expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
              break;
            case '7d':
              expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              break;
            case '30d':
              expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
              break;
            case 'custom': {
              const customExpiryValue = document.getElementById('customExpiry').value;
              if (!customExpiryValue) {
                renderError(resultDiv, '请选择自定义有效期');
                submitButton.disabled = false;
                submitButton.textContent = '生成短链接';
                return;
              }

              expiryDate = new Date(customExpiryValue);
              if (Number.isNaN(expiryDate.getTime())) {
                renderError(resultDiv, '自定义有效期格式无效');
                submitButton.disabled = false;
                submitButton.textContent = '生成短链接';
                return;
              }
              break;
            }
          }
        }

        const formData = {
          url: document.getElementById('url').value,
          slug: document.getElementById('slug').value,
          expiry: expiryDate ? expiryDate.toISOString() : null,
          password: document.getElementById('password').value,
          maxVisits: document.getElementById('maxVisits').value
        };

        const response = await fetch('/api/shorten', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
          resultDiv.innerHTML = \`
            <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p class="text-sm font-semibold text-gray-900">短链接生成成功</p>
              <p class="mt-1 text-sm text-gray-500">复制后即可直接分享。</p>
              <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                <input type="text" value="\${data.shortened}" readonly
                  class="w-full flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none">
                <button onclick="copyToClipboard(this, '\${data.shortened}')"
                  class="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black">
                  复制链接
                </button>
              </div>
            </div>
          \`;
        } else {
          renderError(resultDiv, data.error);
        }
      } catch (error) {
        renderError(resultDiv, '生成短链接时发生错误，请重试');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = '生成短链接';
      }
    });

    document.getElementById('expiry').addEventListener('change', function() {
      const customExpiryInput = document.getElementById('customExpiry');
      if (this.value === 'custom') {
        customExpiryInput.classList.remove('hidden');
      } else {
        customExpiryInput.classList.add('hidden');
      }
    });

    function renderError(resultDiv, message) {
      resultDiv.innerHTML = '<div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><p class="text-sm font-medium text-gray-700"></p></div>';
      resultDiv.querySelector('p').textContent = message;
    }

    function copyToClipboard(button, text) {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '已复制';
        button.classList.remove('bg-gray-900', 'text-white', 'hover:bg-black');
        button.classList.add('border', 'border-gray-300', 'bg-white', 'text-gray-900', 'hover:bg-gray-100');

        setTimeout(() => {
          button.textContent = originalText;
          button.classList.add('bg-gray-900', 'text-white', 'hover:bg-black');
          button.classList.remove('border', 'border-gray-300', 'bg-white', 'text-gray-900', 'hover:bg-gray-100');
        }, 2000);
      }).catch(() => {
        const originalText = button.textContent;
        button.textContent = '复制失败';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      });
    }
    </script>
</body>
</html>`;

  return new Response(frontendHTML, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    },
  });
}

async function handleAPIRequest(request) {
  try {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/shorten") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "请求方法不允许" }), {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Allow": "POST"
          }
        });
      }

      const { url, slug, expiry, password, maxVisits } = await request.json();
      if (!url) {
        return new Response(JSON.stringify({ error: "请输入链接地址" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate URL
      let parsedURL;
      try {
        parsedURL = new URL(url);
      } catch {
        return new Response(JSON.stringify({ error: "链接格式无效" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!["http:", "https:"].includes(parsedURL.protocol)) {
        return new Response(JSON.stringify({ error: "仅支持 http 和 https 链接" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 添加最大访问次数验证
      if (maxVisits && (parseInt(maxVisits) <= 0 || isNaN(parseInt(maxVisits)))) {
        return new Response(JSON.stringify({ error: "最大访问次数必须大于0" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 添加自定义有效期验证
      if (typeof expiry === "string" && expiry.trim() === "") {
        return new Response(JSON.stringify({ error: "请选择有效期" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (expiry) {
        const expiryDate = new Date(expiry);
        const now = new Date();
        if (Number.isNaN(expiryDate.getTime())) {
          return new Response(JSON.stringify({ error: "有效期格式无效" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (expiryDate <= now) {
          return new Response(JSON.stringify({ error: "有效期必须大于当前时间" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // 移除URL检查代码，直接生成新的短链接
      const shortSlug = slug || generateSlug();

      // 添加自定义短链接长度验证
      if (slug && slug.length < 3) {
        return new Response(JSON.stringify({ error: "自定义链接至少需要3个字符" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate slug format
      if (!/^[a-zA-Z0-9-_]+$/.test(shortSlug)) {
        return new Response(JSON.stringify({ error: "自定义链接格式无效，只能使用字母、数字、横线和下划线" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const existing = await URL_SHORT_KV.get(shortSlug);
      if (existing) {
        return new Response(JSON.stringify({ error: "该自定义链接已被使用" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const expiryTimestamp = expiry ? new Date(expiry).getTime() : null;
      await URL_SHORT_KV.put(shortSlug, JSON.stringify({
        url,
        expiry: expiryTimestamp,
        password,
        created: Date.now(),
        maxVisits: maxVisits ? parseInt(maxVisits) : null,
        visits: 0
      }));

      const baseURL = new URL(request.url).origin;
      const shortURL = `${baseURL}/${shortSlug}`;
      return new Response(JSON.stringify({ shortened: shortURL }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (pathname.startsWith('/api/verify/')) {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "请求方法不允许" }), {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Allow": "POST"
          }
        });
      }

      const slug = pathname.replace('/api/verify/', '');
      const record = await URL_SHORT_KV.get(slug);

      if (!record) {
        return new Response(JSON.stringify({ error: "链接不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const { password: correctPassword, url, maxVisits, visits = 0 } = JSON.parse(record);
      const { password: inputPassword } = await request.json();

      let parsedURL;
      try {
        parsedURL = new URL(url);
      } catch {
        return new Response(JSON.stringify({ error: "链接配置无效" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!["http:", "https:"].includes(parsedURL.protocol)) {
        return new Response(JSON.stringify({ error: "链接协议不受支持" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (inputPassword === correctPassword) {
        if (maxVisits) {
          const newVisits = visits + 1;
          await URL_SHORT_KV.put(slug, JSON.stringify({
            ...JSON.parse(record),
            visits: newVisits
          }));
        }

        return new Response(JSON.stringify({
          success: true,
          url: parsedURL.toString()
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: "密码错误"
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    return new Response(JSON.stringify({ error: "页面不存在" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleRedirect(pathname) {
  try {
    const slug = pathname.slice(1);
    const record = await URL_SHORT_KV.get(slug);

    if (!record) {
      return new Response("链接不存在", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const data = JSON.parse(record);
    const { url, expiry, password, maxVisits, visits = 0 } = data;

    let parsedURL;
    try {
      parsedURL = new URL(url);
    } catch {
      return new Response("链接配置无效", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (!["http:", "https:"].includes(parsedURL.protocol)) {
      return new Response("链接协议不受支持", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (expiry && Date.now() > expiry) {
      await URL_SHORT_KV.delete(slug);
      return new Response("链接已过期", {
        status: 410,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (maxVisits && visits >= maxVisits) {
      await URL_SHORT_KV.delete(slug);
      return new Response("链接访问次数已达上限", {
        status: 410,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // 只在没有密码保护时更新访问次数
    if (maxVisits && !password) {
      data.visits = visits + 1;
      await URL_SHORT_KV.put(slug, JSON.stringify(data));
    }

    if (password) {
      const frontendHTML = `<!DOCTYPE html>
      <html lang="zh">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>密码保护链接</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔒</text></svg>">
      </head>
      <body class="min-h-screen bg-gray-50 text-gray-900">
        <main class="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
          <section class="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div class="mb-6 border-b border-gray-100 pb-6">
              <div class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium uppercase tracking-widest text-gray-500">
                Protected Link
              </div>
              <h1 class="mt-4 text-2xl font-semibold text-gray-900">密码保护链接</h1>
              <p class="mt-2 text-sm leading-6 text-gray-600">输入访问密码后继续跳转到目标地址。</p>
            </div>
            <form id="password-form" class="space-y-4">
              <div>
                <label for="password" class="mb-2 block text-sm font-medium text-gray-700">请输入访问码</label>
                <input id="password" type="password" class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200" required>
              </div>
              <button type="submit" class="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2">
                访问链接
              </button>
            </form>
            <div id="error" class="mt-4"></div>
          </section>
        </main>
        <script>
          document.getElementById('password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = e.target.querySelector('button[type="submit"]');
            const inputPassword = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');

            submitButton.disabled = true;
            submitButton.textContent = '验证中...';
            errorDiv.innerHTML = '';

            try {
              const response = await fetch('/api/verify/${encodeURIComponent(slug)}', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  password: inputPassword
                })
              });

              const data = await response.json();

              if (data.success) {
                window.location.replace(data.url);
              } else {
                renderPasswordError(errorDiv, data.error || '密码错误');
              }
            } catch (error) {
              renderPasswordError(errorDiv, '发生错误，请重试');
            } finally {
              submitButton.disabled = false;
              submitButton.textContent = '访问链接';
            }
          });

          function renderPasswordError(errorDiv, message) {
            errorDiv.innerHTML = '<div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"></div>';
            errorDiv.firstElementChild.textContent = message;
          }
        </script>
      </body>
      </html>`;

      return new Response(frontendHTML, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
      });
    }

    return Response.redirect(parsedURL.toString(), 302);
  } catch (error) {
    console.error('Redirect Error:', error);
    return new Response("服务器内部错误", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

function generateSlug(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
