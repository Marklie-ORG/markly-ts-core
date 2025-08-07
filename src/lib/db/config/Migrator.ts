import { MikroORM } from "@mikro-orm/core";
import { Log } from "../../classes/Logger.js";
import { Database } from "./DB.js";

const logger = Log.getInstance().extend("migrations");

export async function runMigrations(): Promise<void> {
  logger.info(
    `Running MikroORM migrations in ${process.env.ENVIRONMENT} environment...`,
  );

  let orm: MikroORM | undefined;

  try {
    const database = await Database.getInstance();

    const migrator = database.orm.getMigrator();
    await migrator.createMigration();

    const pendingMigrations = await migrator.getPendingMigrations();
    if (pendingMigrations && pendingMigrations.length > 0) {
      logger.info(`Found ${pendingMigrations.length} pending migrations.`);
      await migrator.up();
      logger.info("✅ Migrations completed successfully.");
    } else {
      logger.info("✅ No pending migrations to run.");
    }
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    process.exitCode = 1;
    throw error;
  } finally {
    if (orm) {
      await orm.close(true);
    }
  }
}
