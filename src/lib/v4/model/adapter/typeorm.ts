import {DeepPartial, FindOptionsWhere, Repository} from "typeorm";
import {AbstractAdapter, AbstractModel} from "../AbstractModel";
import {FindOptions} from "../AbstractModel";

// TODO TypeORM classes realized schematically and need to be tested

export class TypeORMModel<T> extends AbstractModel<T> {
    private repository: Repository<T>;

    constructor(repository: Repository<T>, modelName: string, model: any) {
        super(modelName, model.attributes, model.primaryKey, model.identity);
        this.repository = repository;
    }

    protected async _count(criteria: Partial<T> | undefined): Promise<number> {
        return this.repository.count({where: criteria as FindOptionsWhere<T>});
    }

    protected async _create(data: Partial<T>): Promise<T> {
        const entity = this.repository.create(data as DeepPartial<T>);
        return this.repository.save(entity);
    }

    protected async _destroy(criteria: Partial<T>): Promise<T[]> {
        const entities = await this._find(criteria, undefined);
        await this.repository.remove(entities);
        return entities;
    }

    protected async _destroyOne(criteria: Partial<T>): Promise<T | null> {
        const entity = await this._findOne(criteria);
        if (entity) {
            await this.repository.remove(entity);
            return entity;
        }
        return null;
    }

    protected async _find(criteria: Partial<T>, options: FindOptions | undefined): Promise<T[]> {
        // Преобразуем критерии для поддержки массивов
        const where = this._convertCriteriaForTypeORM(criteria);
        return this.repository.find({where, ...options});
    }

    private _convertCriteriaForTypeORM(criteria: any): any {
        const result: any = {};

        for (const key in criteria) {
            const value = criteria[key];

            if (Array.isArray(value)) {
                // Для массивов используем оператор IN
                result[key] = {$in: value};
            } else if (typeof value === 'object' && value !== null) {
                // Обработка вложенных объектов с операторами
                result[key] = value;
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    protected async _findOne(criteria: Partial<T>): Promise<T | null> {
        return this.repository.findOne({where: criteria as FindOptionsWhere<T>});
    }

    protected async _update(
        criteria: Partial<T>,
        data: Partial<T>
    ): Promise<T[]> {
        const entities = await this._find(criteria, undefined);
        for (const entity of entities) {
            Object.assign(entity, data);
        }
        return this.repository.save(entities);
    }

    protected async _updateOne(
        criteria: Partial<T>,
        data: Partial<T>
    ): Promise<T | null> {
        const entity = await this._findOne(criteria);
        if (entity) {
            Object.assign(entity, data);
            return this.repository.save(entity);
        }
        return null;
    }
}


export class TypeORMAdapter extends AbstractAdapter {
    public Model: any = TypeORMModel;

    constructor(orm: any) {
        super("typeorm", orm);
    }

    get models(): Record<string, any> {
        return this.orm.models;
    }

    registerModel(modelName: string, attributes: any): any {
        return undefined;
    }

    getAttributes(modelName: string): any {
        return undefined;
    }

    getModel(modelName: string): any {
        return undefined;
    }
}
