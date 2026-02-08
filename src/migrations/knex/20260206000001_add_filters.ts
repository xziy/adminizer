import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const getDefaultTimestamp = () => {
    const client = knex.client.config.client;
    if (client === "pg" || client === "postgresql") {
      return knex.raw("CURRENT_TIMESTAMP");
    } else if (client === "sqlite3") {
      return knex.raw("(datetime('now'))");
    } else if (client === "mysql" || client === "mysql2") {
      return knex.raw("CURRENT_TIMESTAMP");
    }
    return knex.fn.now();
  };

  const getUuidDefault = () => {
    const client = knex.client.config.client;
    if (client === "pg" || client === "postgresql") {
      return knex.raw("gen_random_uuid()");
    } else if (client === "sqlite3") {
      return undefined;
    }
    return knex.raw("UUID()");
  };

  const defaultTimestamp = getDefaultTimestamp();
  const uuidDefault = getUuidDefault();

  await knex.schema.createTable("filterap", (table) => {
    if (uuidDefault) {
      table.uuid("id").primary().notNullable().defaultTo(uuidDefault);
    } else {
      table.uuid("id").primary().notNullable();
    }
    table.string("name").notNullable();
    table.string("description");
    table.string("modelName").notNullable();
    table.string("slug").notNullable().unique();
    table.json("conditions").notNullable().defaultTo("[]");
    table.string("sortField");
    table.string("sortDirection").notNullable().defaultTo("ASC");
    table.string("visibility").notNullable().defaultTo("private");
    table.integer("ownerId").notNullable().references("id").inTable("userap").onDelete("CASCADE");
    table.json("groupIds").notNullable().defaultTo("[]");
    table.boolean("apiEnabled").notNullable().defaultTo(false);
    table.string("apiKey").unique();
    table.string("icon");
    table.string("color");
    table.boolean("isPinned").notNullable().defaultTo(false);
    table.boolean("isSystemFilter").notNullable().defaultTo(false);
    table.integer("version").notNullable().defaultTo(1);
    table.string("schemaVersion");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.index(["modelName"]);
    table.index(["ownerId"]);
    table.index(["apiKey"]);
    table.index(["slug"]);
  });

  await knex.schema.createTable("filtercolumnap", (table) => {
    table.increments("id").primary().notNullable();
    if (uuidDefault) {
      table.uuid("filterId").notNullable().references("id").inTable("filterap").onDelete("CASCADE");
    } else {
      table.uuid("filterId").notNullable().references("id").inTable("filterap").onDelete("CASCADE");
    }
    table.string("fieldName").notNullable();
    table.integer("order").notNullable().defaultTo(0);
    table.integer("width");
    table.boolean("isVisible").notNullable().defaultTo(true);
    table.boolean("isEditable").notNullable().defaultTo(false);
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.index(["filterId"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("filtercolumnap");
  await knex.schema.dropTableIfExists("filterap");
}
