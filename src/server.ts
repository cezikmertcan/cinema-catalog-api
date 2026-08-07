import { buildApp } from "./app";

const app = buildApp();
const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Cinema Catalog API listening on port ${port}`);
});

server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
