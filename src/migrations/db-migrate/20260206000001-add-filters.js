'use strict';

var async = require('async');
var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
  async.series([
    (cb) => db.createTable('filterap', {
      columns: {
        "id": {
          "type": "text",
          "primaryKey": true,
          "notNull": true
        },
        "name": {
          "type": "text",
          "notNull": true
        },
        "description": {
          "type": "text"
        },
        "modelName": {
          "type": "text",
          "notNull": true
        },
        "slug": {
          "type": "text",
          "notNull": true,
          "unique": true
        },
        "conditions": {
          "type": "json"
        },
        "sortField": {
          "type": "text"
        },
        "sortDirection": {
          "type": "text"
        },
        "visibility": {
          "type": "text"
        },
        "ownerId": {
          "type": "integer",
          "notNull": true
        },
        "groupIds": {
          "type": "json"
        },
        "apiEnabled": {
          "type": "boolean"
        },
        "apiKey": {
          "type": "text"
        },
        "icon": {
          "type": "text"
        },
        "color": {
          "type": "text"
        },
        "isPinned": {
          "type": "boolean"
        },
        "isSystemFilter": {
          "type": "boolean"
        },
        "version": {
          "type": "integer"
        },
        "schemaVersion": {
          "type": "text"
        },
        "createdAt": {
          "type": "bigint"
        },
        "updatedAt": {
          "type": "bigint"
        }
      },
      ifNotExists: true
    }, cb),
    (cb) => db.createTable('filtercolumnap', {
      columns: {
        "id": {
          "type": "int",
          "primaryKey": true,
          "autoIncrement": true,
          "notNull": true
        },
        "filterId": {
          "type": "text",
          "notNull": true
        },
        "fieldName": {
          "type": "text",
          "notNull": true
        },
        "order": {
          "type": "int"
        },
        "width": {
          "type": "int"
        },
        "isVisible": {
          "type": "boolean"
        },
        "isEditable": {
          "type": "boolean"
        },
        "createdAt": {
          "type": "bigint"
        },
        "updatedAt": {
          "type": "bigint"
        }
      },
      ifNotExists: true
    }, cb)
  ], callback);
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
