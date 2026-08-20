export const rootPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cinema Catalog API</title>
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6f8; color: #17202a; }
      main { width: min(560px, calc(100% - 48px)); padding: 40px; border: 1px solid #dce1e6; border-radius: 12px; background: #ffffff; box-shadow: 0 12px 30px rgba(23, 32, 42, 0.08); }
      h1 { margin-top: 0; }
      p { color: #52606d; line-height: 1.6; }
      nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
      a { padding: 10px 14px; border-radius: 8px; background: #17202a; color: #ffffff; text-decoration: none; }
      a:hover { background: #334e68; }
    </style>
  </head>
  <body>
    <main>
      <h1>Cinema Catalog API</h1>
      <p>REST API for movies, directors and token-based authentication.</p>
      <nav aria-label="API resources">
        <a href="/docs">OpenAPI documentation</a>
        <a href="/openapi.json">OpenAPI JSON</a>
        <a href="/health">Health check</a>
      </nav>
    </main>
  </body>
</html>`;
