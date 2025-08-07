import { MikroORM, EntityManager } from "@mikro-orm/postgresql";
import config from "../config/mikro-orm.config.js";

export class Database {
  private static instance: Database;
  public orm: MikroORM;
  public em: EntityManager;

  private constructor(orm: MikroORM) {
    this.orm = orm;
    this.em = orm.em.fork() as EntityManager;
  }

  public static async getInstance(): Promise<Database> {
    if (!Database.instance) {
      const orm = await MikroORM.init({
        ...config,
      });
      Database.instance = new Database(orm);
    }
    return Database.instance;
  }
}
