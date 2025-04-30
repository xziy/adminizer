import {DataAccessor} from "../DataAccessor";
import Waterline from "waterline";

export interface Attribute {
  type: 'association' | 'association-many' | 'number' | 'json' | 'string' | 'boolean' | 'ref';
  required?: boolean;
  unique?: boolean;
  defaultsTo?: any;
  columnName?: string;
  model?: string;
  collection?: string;
  via?: string;
  allowNull?: boolean;
}

export interface ModelAttributes {
  [key: string]: Attribute;
}

export type ModelAnyField = number | string | boolean | Date | Array<number | string | boolean> | { [key: string]: number | string | boolean | Date };

export type ModelAnyInstance = {
  [key: string]: ModelAnyField
}

type PopulateOption = [string, { sort?: string, where?: any }];

export interface FindOptions {
  populate?: PopulateOption[]
  limit?: number
}




export abstract class AbstractModel<T> {
  public readonly modelname: string;
  public readonly attributes: ModelAttributes;
  public readonly primaryKey: string;
  public readonly identity: string;

  protected constructor(modelname: string, attributes: ModelAttributes, primaryKey: string, identity: string) {
    this.modelname = modelname;
    this.attributes = attributes;
    this.primaryKey = primaryKey;
    this.identity = identity;
  }

  // TODO Partial<T> should be changed to WaterlineCriteria
  protected abstract _create(data: Partial<T>): Promise<T>;
  protected abstract _findOne(criteria: Partial<T>): Promise<T | null>;
  protected abstract _find(criteria: Partial<T>, options?: FindOptions): Promise<T[]>;
  protected abstract _updateOne(criteria: Partial<T>, data: Partial<T>): Promise<T | null>;
  protected abstract _update(criteria: Partial<T>, data: Partial<T>): Promise<T[]>;
  protected abstract _destroyOne(criteria: Partial<T>): Promise<T | null>;
  protected abstract _destroy(criteria: Partial<T>): Promise<T[]>;
  protected abstract _count(criteria: Partial<T> | undefined): Promise<number>;

  public async create(data: T, dataAccessor: DataAccessor): Promise<Partial<T>> {
    let _data = await dataAccessor.setUserRelationAccess(dataAccessor.process(data));
    let record = await this._create(_data);
    return dataAccessor.process(record);
  }

  public async findOne(criteria: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
    criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
    let record = await this._findOne(criteria);
    console.log(record, "record")
    return record ? dataAccessor.process(record) : null;
  }

  public async find(criteria: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
    criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
    let records = await this._find(criteria);
    console.log(records, "records")

    return records.map(record => dataAccessor.process(record));
  }

  public async updateOne(criteria: Partial<T>, data: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
    let _data = dataAccessor.process(data);
    criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
    let record = await this._updateOne(criteria, _data);
    return record ? dataAccessor.process(record) : null;
  }

  public async update(criteria: Partial<T>, data: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
    let _data = dataAccessor.process(data);
    criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
    let records = await this._update(criteria, _data);
    return records.map(record => dataAccessor.process(record));
  }

  public async destroyOne(criteria: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
    criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
    let record = await this._destroyOne(criteria);
    return record ? dataAccessor.process(record) : null;
  }

  public async destroy(criteria: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
    criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
    let records = await this._destroy(criteria);
    return records.map(record => dataAccessor.process(record));
  }

  public async count(criteria: Partial<T> | undefined): Promise<number> {
    return this._count(criteria);
  }

}




export abstract class AbstractAdapter {
  public abstract Model: any;

  public readonly orm: any;
  public readonly ormType: string;

  protected constructor(type: string, orm: any) {
    this.ormType = type;
    this.orm = orm;
  }

  abstract get models(): Record<string, any>

  /** This function should return constant type from any adapter (for adminizer proper work) */
  abstract getAttributes(modelName: string): Waterline.Attributes;

  /** Return full model object */
  abstract getModel(modelName: string): any;

  /**
   * This method must ensure system models registration and throw an error in case of errors. We force all adapters to realize it
   */
  static registerSystemModels(orm: any) {
    throw new Error("Function 'registerSystemModels' must be implemented by subclass");
  }
}
