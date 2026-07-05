/**
 * Local development database.
 *
 * Runs a real PostgreSQL server via embedded-postgres (no system install
 * needed) with its data directory in ./.pgdata (gitignored). Production
 * deployments point DATABASE_URL at a managed PostgreSQL instead and
 * never use this script.
 *
 *   npm run db:dev          # start (creates + initialises on first run)
 */
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.PGPORT || 5432);
const pg = new EmbeddedPostgres({
  databaseDir: "./.pgdata",
  user: "soie",
  password: "soie_dev_password",
  port: PORT,
  persistent: true,
});

const url = `postgresql://soie:soie_dev_password@localhost:${PORT}/soie_clinic`;

async function main() {
  const fs = await import("node:fs");
  if (!fs.existsSync("./.pgdata/PG_VERSION")) {
    console.log("[dev-db] initialising new PostgreSQL cluster in ./.pgdata …");
    await pg.initialise();
  }
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = 'soie_clinic'");
  if (exists.rowCount === 0) {
    await pg.createDatabase("soie_clinic");
    console.log("[dev-db] created database soie_clinic");
  }
  await client.end();
  console.log(`[dev-db] PostgreSQL ready on port ${PORT}`);
  console.log(`[dev-db] DATABASE_URL=${url}`);
  console.log("[dev-db] press Ctrl+C to stop");

  const stop = async () => {
    console.log("\n[dev-db] stopping …");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // keep the process alive
  setInterval(() => {}, 1 << 30);
}

main().catch(async (err) => {
  console.error("[dev-db] failed:", err);
  try {
    await pg.stop();
  } catch {}
  process.exit(1);
});
