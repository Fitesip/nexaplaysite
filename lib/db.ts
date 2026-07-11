import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

export function getPool() {
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      // Must match the default in server.js's own pool — they're two separate mysql2
      // pools (see the comment at the top of server.js for why), and a mismatch here
      // means the WS upgrade handler silently authenticates against a different
      // database than the rest of the app: the role/banned lookup finds no row, the
      // socket falls back to "anonymous", and identity-scoped pushes (support chat,
      // notifications) never fire — only the periodic REST polling ever catches up.
      database: process.env.DB_NAME ?? "nexa",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });
  }
  return global._mysqlPool;
}
