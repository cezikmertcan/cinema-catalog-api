const swaggerUiVersion = "5.32.12";
const swaggerUiCdnBase =
  `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}`;

export const swaggerPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cinema Catalog API Documentation</title>
    <link rel="stylesheet" href="${swaggerUiCdnBase}/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>

    <script src="${swaggerUiCdnBase}/swagger-ui-bundle.js"></script>
    <script src="${swaggerUiCdnBase}/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: "/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset,
          ],
          plugins: [SwaggerUIBundle.plugins.DownloadUrl],
          layout: "StandaloneLayout",
        });
      };
    </script>
  </body>
</html>`;
