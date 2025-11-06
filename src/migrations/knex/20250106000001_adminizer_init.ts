import { Knex } from "knex";

/**
 * Creates all system model tables for Adminizer
 * Tables: userap, groupap, mediamanagerap, mediamanagermetaap, mediamanagerassociationsap,
 *         notificationap, usernotificationap, navigationap, groupapuserap
 */
export async function up(knex: Knex): Promise<void> {
  // userap
  await knex.schema.createTable("userap", (table) => {
    table.increments("id").primary().notNullable();
    table.string("login").unique();
    table.string("fullName");
    table.string("email");
    table.string("avatar");
    table.string("passwordHashed");
    table.string("timezone");
    table.string("expires");
    table.string("locale");
    table.boolean("isDeleted");
    table.boolean("isActive");
    table.boolean("isAdministrator");
    table.json("widgets");
    table.boolean("isConfirmed");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
  });

  // groupap
  await knex.schema.createTable("groupap", (table) => {
    table.increments("id").primary().notNullable();
    table.string("name").unique();
    table.string("description");
    table.json("tokens");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
  });

  // mediamanagerap (self-ref via parentId)
  await knex.schema.createTable("mediamanagerap", (table) => {
    table.uuid("id").primary().notNullable().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("parentId").nullable().references("id").inTable("mediamanagerap").onDelete("SET NULL");
    table.string("mimeType");
    table.string("path");
    table.integer("size");
    table.string("group");
    table.string("tag");
    table.string("url");
    table.string("filename");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
  });

  // mediamanagermetaap (belongsTo mediamanagerap via parentId)
  await knex.schema.createTable("mediamanagermetaap", (table) => {
    table.uuid("id").primary().notNullable().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("key");
    table.json("value");
    table.boolean("isPublic");
    table.uuid("parentId").nullable().references("id").inTable("mediamanagerap").onDelete("SET NULL");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
  });

  // mediamanagerassociationsap (belongsTo mediamanagerap via fileId)
  await knex.schema.createTable("mediamanagerassociationsap", (table) => {
    table.uuid("id").primary().notNullable().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("mediaManagerId");
    table.json("model");
    table.json("modelId");
    table.string("widgetName");
    table.integer("sortOrder");
    table.uuid("fileId").nullable().references("id").inTable("mediamanagerap").onDelete("SET NULL");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
  });

  // notificationap
  await knex.schema.createTable("notificationap", (table) => {
    table.increments("id").primary().notNullable();
    table.string("title");
    table.string("message");
    table.string("notificationClass");
    table.string("channel");
    table.json("metadata");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
  });

  // usernotificationap (FK to notificationap via column notificationIdId)
  await knex.schema.createTable("usernotificationap", (table) => {
    table.increments("id").primary().notNullable();
    table.integer("userId");
    table.integer("notificationIdId").nullable().references("id").inTable("notificationap").onDelete("SET NULL");
    table.boolean("read");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
  });

  // navigationap
  await knex.schema.createTable("navigationap", (table) => {
    table.increments("id").primary().notNullable();
    table.string("label").unique();
    table.json("tree");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
  });

  // M:N join: GroupAP <-> UserAP via "groupapuserap"
  await knex.schema.createTable("groupapuserap", (table) => {
    table.integer("UserAPId").notNullable().references("id").inTable("userap").onDelete("CASCADE");
    table.integer("GroupAPId").notNullable().references("id").inTable("groupap").onDelete("CASCADE");
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
    table.primary(["UserAPId", "GroupAPId"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("groupapuserap");
  await knex.schema.dropTableIfExists("usernotificationap");
  await knex.schema.dropTableIfExists("mediamanagermetaap");
  await knex.schema.dropTableIfExists("mediamanagerassociationsap");
  await knex.schema.dropTableIfExists("mediamanagerap");
  await knex.schema.dropTableIfExists("navigationap");
  await knex.schema.dropTableIfExists("notificationap");
  await knex.schema.dropTableIfExists("groupap");
  await knex.schema.dropTableIfExists("userap");
}
