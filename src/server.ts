import { createApp } from "./app.js";
import { openDb } from "./db.js";

const port = Number(process.env.PORT ?? 3000);

const db = openDb();
const server = createApp(db).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    console.log("Server stopped, database closed");
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
