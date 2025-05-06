import { Sequelize, DataTypes, ModelAttributes, ModelStatic, IncludeOptions, Op } from "sequelize";
import { AbstractAdapter, AbstractModel, FindOptions } from "../AbstractModel";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { v4 as uuid } from "uuid";




function mapSequelizeAttributesToAbstract(attrs: ReturnType<ModelStatic<any>["getAttributes"]>): Record<string, AbstractAttribute> {
  const result: Record<string, AbstractAttribute> = {};
  for (const key in attrs) {
    const attr = attrs[key];
    const resolvedType = resolveType(attr.type);

    result[key] = {
      type: resolvedType as AbstractFieldType,
      required: !attr.allowNull,
      primaryKey: !!attr.primaryKey,
      unique: !!attr.unique,
    };
  }
  return result;
}

type AbstractFieldType =
  | "string"
  | "number"
  | "boolean"
  | "json"
  | "ref"
  | "association"
  | "association-many";

type AbstractAttribute = {
  type: AbstractFieldType;
  required?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
};

function resolveType(type: any): AbstractFieldType {
  try {
    const sqlType = typeof type.toString === "function"
      ? type.toString().toLowerCase()
      : "";

    if (sqlType.includes("string")) return "string";
    if (sqlType.includes("uuid")) return "string";
    if (sqlType.includes("int") || sqlType.includes("float") || sqlType.includes("decimal")) return "number";
    if (sqlType.includes("bool")) return "boolean";
    if (sqlType.includes("json")) return "json";
    if (sqlType.includes("date")) return "string"; // 👈 фикс: дата как строка

    return "ref";
  } catch {
    return "ref";
  }
}
/** SequelizeModel — реализация модели, совместимая с AbstractModel */




function convertCriteriaToSequelize(criteria: any): any {
  console.debug("waterline criteria", criteria)
  const result: any = {};

  for (const key in criteria) {
    const value = criteria[key];

    if (
      value === undefined ||
      value === null ||
      (typeof value === "object" && Object.keys(value).length === 0)
    ) {
      continue; // ⛔ пропускаем пустые условия
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const operatorEntries = Object.entries(value)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([op, val]) => {
          switch (op) {
            case "contains": return [Op.like, `%${val}%`];
            case "startsWith": return [Op.startsWith, val];
            case "endsWith": return [Op.endsWith, val];
            case ">": return [Op.gt, val];
            case ">=": return [Op.gte, val];
            case "<": return [Op.lt, val];
            case "<=": return [Op.lte, val];
            case "!=": return [Op.ne, val];
            case "in": return [Op.in, val];
            case "nin": return [Op.notIn, val];
            default: return [Op.eq, val];
          }
        });

      if (operatorEntries.length > 0) {
        result[key] = Object.fromEntries(operatorEntries);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

function convertWaterlineCriteriaToSequelizeOptions(criteria: any): {
  where?: any;
  limit?: number;
  offset?: number;
  order?: any[];
} {
  console.debug("WATERLINE CRITERIA", criteria)
  const { where = {}, skip, limit, sort } = criteria;
  const result: any = {
    where: convertCriteriaToSequelize(where),
  };

  if (typeof skip === "number") {
    result.offset = skip;
  }

  if (typeof limit === "number") {
    result.limit = limit;
  }

  if (typeof sort === "string") {
    const [field, direction] = sort.trim().split(/\s+/);
    result.order = [[field, direction?.toUpperCase() === "DESC" ? "DESC" : "ASC"]];
  }

  return result;
}


export class SequelizeModel<T> extends AbstractModel<T> {
  private model: ModelStatic<any>;

  constructor(modelName: string, model: ModelStatic<any>) {
    super(
      modelName,
      mapSequelizeAttributesToAbstract(model.getAttributes()),
      model.primaryKeyAttribute,
      model.name
    );
    this.model = model;
  }

  // --- CREATE ---
  protected async _create(data: Record<string, any>): Promise<T> {

    const created = await this.model.create(data);
    const result = await this.model.findByPk(created.get(this.primaryKey), { raw: true });

    return result;
  }

  // --- FIND ONE ---
  protected async _findOne(criteria: Partial<T>): Promise<T | null> {
    const { where } = convertWaterlineCriteriaToSequelizeOptions(criteria);

    const result = await this.model.findOne({
      where,
      include: this._buildIncludes(),
      raw: true,
    });

    return result;
  }

  // --- FIND MANY ---
  protected async _find(criteria: Partial<T> = {}, options: FindOptions = {}): Promise<T[]> {
    const { where, limit, offset, order } = convertWaterlineCriteriaToSequelizeOptions(criteria);
    const include = options.populate
      ? options.populate.map(([field, opts]) => ({ association: field, ...opts }))
      : this._buildIncludes();





    const result = await this.model.findAll({
      where,
      limit,
      offset,
      order,
      include,
      raw: true,
    });


    return result;
  }

  // --- UPDATE ONE ---
  protected async _updateOne(criteria: Partial<T>, data: Partial<T>): Promise<T | null> {
    const { where } = convertWaterlineCriteriaToSequelizeOptions(criteria);

    const record = await this.model.findOne({ where });
    if (!record) {

      return null;
    }
    await record.update(data);
    const result = await this.model.findByPk(record.get(this.primaryKey), { raw: true });

    return result;
  }

  // --- UPDATE MANY ---
  protected async _update(criteria: Partial<T>, data: Partial<T>): Promise<T[]> {
    const { where } = convertWaterlineCriteriaToSequelizeOptions(criteria);

    await this.model.update(data, { where });
    const result = await this.model.findAll({ where, raw: true });

    return result;
  }

  // --- DESTROY ONE ---
  protected async _destroyOne(criteria: Partial<T>): Promise<T | null> {
    const { where } = convertWaterlineCriteriaToSequelizeOptions(criteria);

    const record = await this.model.findOne({ where });
    if (!record) {

      return null;
    }
    const raw = record.get({ plain: true });
    await record.destroy();

    return raw;
  }

  // --- DESTROY MANY ---
  protected async _destroy(criteria: Partial<T>): Promise<T[]> {
    const { where } = convertWaterlineCriteriaToSequelizeOptions(criteria);

    const records = await this.model.findAll({ where });
    const raw = records.map(r => r.get({ plain: true }));
    await this.model.destroy({ where });

    return raw;
  }

  // --- COUNT ---
  protected async _count(criteria: Partial<T> = {}): Promise<number> {
    const { where } = convertWaterlineCriteriaToSequelizeOptions(criteria);

    const result = await this.model.count({ where });

    return result;
  }

  // --- HELPER ---
  private _buildIncludes(): IncludeOptions[] {
    return Object.keys(this.model.associations).map(key => ({ association: key }));
  }
}



/** SequelizeAdapter — адаптер, заменяющий WaterlineAdapter */
export class SequelizeAdapter extends AbstractAdapter {
  public Model = SequelizeModel;

  constructor(private sequelize: Sequelize) {
    super("sequelize", sequelize);
  }

  get models(): Record<string, any> {
    return this.sequelize.models;
  }

  getModel(modelName: string): any {
    const matchedKey = Object.keys(this.sequelize.models).find(
      key => key.toLowerCase() === modelName.toLowerCase()
    );

    if (!matchedKey) {
      return undefined;
    }
    console.log("this.sequelize.models[matchedKey]",this.sequelize.models[matchedKey])

    return this.sequelize.models[matchedKey];
  }

  getAttributes(modelName: string): any {
    const model = this.getModel(modelName);
    console.log(1111,model?.getAttributes())
    return model?.getAttributes();
  }

  /** Регистрация системных моделей */
  static async registerSystemModels(sequelize: Sequelize): Promise<void> {
    const modelsDir = path.resolve(import.meta.dirname, "../../../../models");
    const files = fs.readdirSync(modelsDir).filter(f => f.endsWith(".js"));

    for (const file of files) {
      const modelName = path.basename(file, path.extname(file));
      const filePath = path.resolve(modelsDir, file);
      const definition = (await import(pathToFileURL(filePath).href)).default;

      generateSequelizeModel(sequelize, modelName, definition);
    }

    await sequelize.sync();
  }
}

/** Генерация модели Sequelize из определения, аналог WaterlineCollection.extend */
function generateSequelizeModel(
  sequelize: Sequelize,
  modelName: string,
  rawAttributes: Record<string, any>
) {
  const attributes: ModelAttributes = {};
  let primaryKey: string | null = null;

  for (const field in rawAttributes) {
    const attr = { ...rawAttributes[field] };

    // 💥 Skip associations (handled separately)
    if (attr.model || attr.collection) {
      continue;
    }

    if (attr.primaryKey) {
      primaryKey = field;
      attr.primaryKey = true;
    }

    if (attr.uuid && attr.type === "string") {
      attr.type = DataTypes.UUID;
      attr.defaultValue = DataTypes.UUIDV4;
      delete attr.uuid;
    }

    if (attr.autoIncrement) {
      attr.autoIncrement = true;
    }

    if (attr.unique) {
      attr.unique = true;
    }

    if (typeof attr.type === "string") {
      switch (attr.type) {
        case "string": attr.type = DataTypes.STRING; break;
        case "number": attr.type = DataTypes.INTEGER; break;
        case "boolean": attr.type = DataTypes.BOOLEAN; break;
        case "json": attr.type = DataTypes.JSON; break;
        case "ref": attr.type = DataTypes.JSON; break;
        case "datetime":
        case "date": attr.type = DataTypes.DATE; break;
        default:
          throw new Error(`Unrecognized datatype "${attr.type}" for field "${field}" in model "${modelName}"`);
      }
    }

    attributes[field] = attr;
  }

  if (!primaryKey) {
    throw new Error(`Model "${modelName}" must have a primary key`);
  }

  return sequelize.define(modelName, attributes, {
    tableName: modelName.toLowerCase(),
    timestamps: true,
  });
}