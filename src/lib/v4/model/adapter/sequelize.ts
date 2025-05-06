import { Sequelize, DataTypes, ModelAttributes, ModelStatic, IncludeOptions, Op, HasMany, BelongsTo, BelongsToMany, HasOne } from "sequelize";
import { AbstractAdapter, AbstractModel, Attribute, FindOptions } from "../AbstractModel";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { v4 as uuid } from "uuid";



function resolveType(type: any): Attribute["type"] {
  const sqlType = typeof type.toString === "function"
    ? type.toString().toLowerCase()
    : "";
  if (sqlType.includes("string") || sqlType.includes("uuid")) return "string";
  if (sqlType.includes("int") || sqlType.includes("float") || sqlType.includes("decimal")) return "number";
  if (sqlType.includes("bool")) return "boolean";
  if (sqlType.includes("json")) return "json";
  if (sqlType.includes("date")) return "string";
  return "ref";
}

export function mapSequelizeToWaterline(model: ModelStatic<any>): Record<string, Attribute> {
  const result: Record<string, Attribute> = {};

  
  const rawAttrs = model.getAttributes();
  for (const name in rawAttrs) {
    const meta = rawAttrs[name];
    result[name] = {
      type: resolveType(meta.type),
      required: meta.allowNull !== undefined ? !meta.allowNull: false,
      allowNull: meta.allowNull,
      unique: !!meta.unique,
      defaultsTo: meta.defaultValue,
      columnName: meta.field || name,
    };
  }

  
  for (const alias in model.associations) {
    const assoc = model.associations[alias];

    switch (assoc.associationType) {
      case "BelongsTo": {
        const a = assoc as BelongsTo;
        result[alias] = {
          type: "association",
          model: a.target.name.toLowerCase(),
          via: a.foreignKey as string,
        };
        break;
      }
      case "HasOne": {
        const a = assoc as HasOne;
        result[alias] = {
          type: "association",
          model: a.target.name.toLowerCase(),
          via: a.foreignKey as string,
        };
        break;
      }
      case "HasMany": {
        const a = assoc as HasMany;
        result[alias] = {
          type: "association-many",
          collection: a.target.name.toLowerCase(),
          via: a.foreignKey as string,
        };
        break;
      }
      case "BelongsToMany": {
        const a = assoc as BelongsToMany;
        result[alias] = {
          type: "association-many",
          collection: a.target.name.toLowerCase(),
          via: a.otherKey as string,
        };
        break;
      }
      default:
        
        break;
    }
  }

  return result;
}


// function mapSequelizeAttributesToAbstract(attrs: ReturnType<ModelStatic<any>["getAttributes"]>): Record<string, AbstractAttribute> {
//   const result: Record<string, AbstractAttribute> = {};
//   for (const key in attrs) {
//     const attr = attrs[key];
//     const resolvedType = resolveType(attr.type);

//     result[key] = {
//       type: resolvedType as AbstractFieldType,
//       required: !attr.allowNull,
//       primaryKey: !!attr.primaryKey,
//       unique: !!attr.unique,
//     };
//   }
//   return result;
// }

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

// function resolveType(type: any): AbstractFieldType {
//   try {
//     const sqlType = typeof type.toString === "function"
//       ? type.toString().toLowerCase()
//       : "";

//     if (sqlType.includes("string")) return "string";
//     if (sqlType.includes("uuid")) return "string";
//     if (sqlType.includes("int") || sqlType.includes("float") || sqlType.includes("decimal")) return "number";
//     if (sqlType.includes("bool")) return "boolean";
//     if (sqlType.includes("json")) return "json";
//     if (sqlType.includes("date")) return "string"; 

//     return "ref";
//   } catch {
//     return "ref";
//   }
// }
/** SequelizeModel — реализация модели, совместимая с AbstractModel */


function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function convertCriteriaToSequelize(criteria: any): any {
  // console.debug("waterline criteria", criteria)
  const result: any = {};

  for (const key in criteria) {
    const value = criteria[key];

    if (
      value === undefined ||
      value === null ||
      (typeof value === "object" && Object.keys(value).length === 0)
    ) {
      continue; 
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
  // console.debug("WATERLINE CRITERIA (raw):", criteria);

  
  const { where: nestedWhere, skip, limit, sort, ...rest } = criteria;

  
  const rawWhere = (nestedWhere && Object.keys(nestedWhere).length > 0)
    ? nestedWhere
    : rest;

  // console.debug("WATERLINE CRITERIA: using rawWhere =", rawWhere);

  
  const where = convertCriteriaToSequelize(rawWhere);
  // console.debug("convertCriteriaToSequelize →", where);

  
  const result: any = { where };

  if (typeof skip === "number") {
    result.offset = skip;
    // console.debug("→ offset =", skip);
  }
  if (typeof limit === "number") {
    result.limit = limit;
    // console.debug("→ limit =", limit);
  }
  if (typeof sort === "string") {
    const [field, dir] = sort.trim().split(/\s+/);
    result.order = [[field, dir?.toUpperCase() === "DESC" ? "DESC" : "ASC"]];
    // console.debug("→ order =", result.order);
  }

  return result;
}

function convertWaterlineCriteriaToSequelizeOptions____OLD(criteria: any): {
  where?: any;
  limit?: number;
  offset?: number;
  order?: any[];
} {
  // console.debug("WATERLINE CRITERIA", criteria)
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
      mapSequelizeToWaterline(model),
      model.primaryKeyAttribute,
      model.name
    );
    this.model = model;
  }

  // --- CREATE ---
  
  protected async _create(data: Record<string, any>): Promise<T> {
    // console.clear()
    
    const assocNames = Object.keys(this.model.associations);
    const plainData: Record<string, any> = {};
    const assocData: Record<string, any> = {};
  
    // console.debug(">> _create: входные данные:", data);
    // console.debug(">> Доступные ассоциации:", assocNames);
  
    for (const [key, val] of Object.entries(data)) {
      if (assocNames.includes(key)) {
        assocData[key] = val;
      } else {
        plainData[key] = val;
      }
    }
  
    // console.debug(">> Обычные поля для create():", plainData);
    // console.debug(">> Данные ассоциаций:", assocData);
  
    
    let instance: any;
    try {
      instance = await this.model.create(plainData);
      // console.debug(">> Создан экземпляр (без ассоциаций):", instance.toJSON());
    } catch (err) {
      // console.error("!! Ошибка при create(plainData):", err);
      throw err;
    }
  
    // assocData = { example: 5, userAPs: [1,2,3], category: 7, tags: [11,22] }
    // this.model.associations — ваш объект ассоциаций
    for (const [alias, ids] of Object.entries(assocData)) {
      const assoc = this.model.associations[alias];
      if (!assoc) {
        // console.warn(`Association "${alias}" not defined on model`);
        continue;
      }

      // @ts-ignore accessors is present
      const { set: setAccessor, add: addAccessor } = assoc.accessors;

      if (Array.isArray(ids)) {
        if (typeof instance[setAccessor] === 'function') {
          await instance[setAccessor](ids);
          continue;
        }
        if (typeof instance[addAccessor] === 'function') {
          for (const id of ids) {
            await instance[addAccessor](id);
          }
          continue;
        }
      }

      if (typeof instance[setAccessor] === 'function') {
        await instance[setAccessor](ids);
      } else if (typeof instance[addAccessor] === 'function') {
        await instance[addAccessor](ids);
      } else {
        // console.warn(`No suitable accessor for "${alias}": tried set=${setAccessor}, add=${addAccessor}`);
      }
    }

    await instance.reload({ include: Object.values(this.model.associations) });

    const pk = this.primaryKey;
    const fresh = await this.model.findByPk(
      instance.get(pk),
      { include: assocNames.map(a => ({ association: a })) }
    );
  
    // console.debug(">> Результат после reload:", fresh?.toJSON());
    return fresh as any;
  }
  
  

// --- FIND ONE ---
protected async _findOne(criteria: Partial<T>): Promise<T | null> {
  // console.debug(">> _findOne: входные критерии:", criteria);

  const { where } = convertWaterlineCriteriaToSequelizeOptions(criteria);
  const includes = this._buildIncludes();
  // console.debug(">> _findOne: преобразованные where:", where);
  // console.debug(">> _findOne: includes:", includes);

  let instance = null;
  try {
    instance = await this.model.findOne({ where, include: includes });
    // console.debug(">> _findOne: сырое instance:", instance ? instance.toJSON() : null);
  } catch (err) {
    // console.error("!! _findOne: ошибка при вызове findOne:", err);
    throw err;
  }

  if (!instance) {
    // console.debug(">> _findOne: ничего не найдено");
    return null;
  }

  const plain = instance.get({ plain: true }) as T;
  // console.debug(">> _findOne: plain результат:", plain);
  return plain;
}

// --- FIND MANY ---
protected async _find(
  criteria: Partial<T> = {},
  options: FindOptions = {}
): Promise<T[]> {
  const assocNames = Object.keys(this.model.associations);
  // console.debug(">> _find: входные criteria:", criteria, "options:", options);

  
  const { where, limit, offset, order } =
    convertWaterlineCriteriaToSequelizeOptions(criteria);
  const includes = options.populate
    ? options.populate.map(([field, opts]) => ({ association: field, ...opts }))
    : assocNames.map(a => ({ association: a }));

  // console.debug(">> _find: where, limit, offset, order, includes:", {
  //   where,
  //   limit,
  //   offset,
  //   order,
  //   includes,
  // });

  let instances: any[];
  try {
    instances = await this.model.findAll({
      where,
      limit,
      offset,
      order,
      include: includes
    });
    // console.debug(">> _find: получено моделей:", instances.length);
  } catch (err) {
    // console.error("!! _find: ошибка в findAll:", err);
    throw err;
  }


  

  for (const inst of instances) {
    //For each association, we call getxxx () once again    
    for (const alias of assocNames) {
      // @ts-ignore accessors is present
      const getAccessor = this.model.associations[alias].accessors.get;
      if (typeof inst[getAccessor] === "function") {
        try {
          const related = await inst[getAccessor]();
          const mapped = Array.isArray(related)
            ? related.map((r: any) => r.toJSON())
            : related?.toJSON();
          // console.debug(`---- get${alias}():`, mapped);
        } catch (e) {
          // console.error(`!! ошибка при вызове ${getAccessor}():`, e);
        }
      }
    }
  }

  const plain = instances.map(i => i.get({ plain: true }) as T);
  // console.debug(">> _find: plain результаты:", plain);
  

  return plain;
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
    

    return this.sequelize.models[matchedKey];
  }

  getAttributes(modelName: string): any {
    const model = this.getModel(modelName);
    
    return model?.getAttributes();
  }

  /**Registration of system models*/
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

/**Generation of the SEQUELIZE model from the definition, analogue of Waterinecollection.extenD*/
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