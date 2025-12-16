import {DataAccessor} from "../DataAccessor";
import Waterline from "waterline";
import {formatChanges, sanitizeForDiff} from "../../helpers/diffHelpers";
import {diff} from "deep-object-diff";

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
    /**
     * This is a field that indicates that it refers to keep the bond key 1: 1
     */
    primaryKeyForAssociation?: boolean;
}

export interface ModelAttributes {
    [key: string]: Attribute;
}

export type ModelAnyField = number | string | boolean | Date | Array<number | string | boolean> | {
    [key: string]: number | string | boolean | Date
};

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

    /**
     * Generate diff between old and new records
     */
    private generateDiff(oldRecord: any, newRecord: any): {
        changesDiff: any,
        formattedChanges: any[],
        cleanOldRecord: any,
        cleanNewRecord: any
    } {
        const cleanOldRecord = sanitizeForDiff(oldRecord);
        const cleanNewRecord = sanitizeForDiff(newRecord);
        const changesDiff = diff(cleanOldRecord, cleanNewRecord);
        const formattedChanges = formatChanges(changesDiff, cleanOldRecord, cleanNewRecord);

        return {
            changesDiff,
            formattedChanges,
            cleanOldRecord,
            cleanNewRecord
        };
    }

    /**
     * Generate delete diff (record vs empty object)
     */
    private generateDeleteDiff(record: any): {
        changesDiff: any,
        formattedChanges: any[],
        cleanRecord: any
    } {
        const cleanRecord = sanitizeForDiff(record);
        const changesDiff = diff(cleanRecord, {});
        const formattedChanges = formatChanges(changesDiff, cleanRecord, {});

        return {
            changesDiff,
            formattedChanges,
            cleanRecord
        };
    }

    /**
     * Log system event with diff
     */
    private async logSystemEvent(
        dataAccessor: DataAccessor,
        eventType: 'Created' | 'Updated' | 'Deleted',
        message: string,
        oldRecord: Partial<T>,
        newRecord: Partial<T>
    ): Promise<void> {
        let formattedChanges: any[] = [];
        let summary = '';

        switch (eventType) {
            case 'Created':
                const cleanNewRecord = sanitizeForDiff(newRecord);
                formattedChanges = formatChanges({}, {}, cleanNewRecord, 'add');
                summary = `Created ${formattedChanges.length} fields`;
                break;

            case 'Updated':
                const {formattedChanges: updateChanges} = this.generateDiff(oldRecord, newRecord);
                formattedChanges = updateChanges;
                summary = `Changes ${formattedChanges.length} fields`;
                break;

            case 'Deleted':
                const {formattedChanges: deleteChanges} = this.generateDeleteDiff(oldRecord);
                formattedChanges = deleteChanges;
                summary = `Deleted ${formattedChanges.length} fields`;
                break;
        }

        // log system event notification
        // await dataAccessor.adminizer.logSystemEvent(
        //     eventType,
        //     message,
        //     {
        //         changes: formattedChanges,
        //         summary
        //     }
        // );
    }

    public async create(data: T, dataAccessor: DataAccessor): Promise<Partial<T>> {
        let _data = await dataAccessor.setUserRelationAccess(dataAccessor.process(data));
        let record = await this._create(_data);

        // Log creation event
        await this.logSystemEvent(
            dataAccessor,
            'Created',
            // @ts-ignore
            `user ${dataAccessor.user.login} create ${dataAccessor.entity.name} ${record[this.primaryKey as string]}`,
            {},
            _data
        );

        return dataAccessor.process(record);
    }

    public async findOne(criteria: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        let record = await this._findOne(criteria);

        return record ? dataAccessor.process(record) : null;
    }

    public async find(criteria: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        let records = await this._find(criteria);
        return records.map(record => dataAccessor.process(record));
    }

    public async updateOne(criteria: Partial<T>, data: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
        let _data = dataAccessor.process(data);

        // Get the old record first for diff
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        const oldRecord = await this._findOne(criteria);

        if (!oldRecord) {
            return null;
        }

        let record = await this._updateOne(criteria, _data);

        if (!record) {
            return null;
        }

        // Log update event
        await this.logSystemEvent(
            dataAccessor,
            'Updated',
            // @ts-ignore
            `user ${dataAccessor.user.login} update ${dataAccessor.entity.name} ${record[this.primaryKey as string]}`,
            oldRecord,
            record
        );

        return dataAccessor.process(record);
    }

    public async update(criteria: Partial<T>, data: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
        let _data = dataAccessor.process(data);
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);

        // Get old records automatically
        const oldRecords = await this._find(criteria);
        let records = await this._update(criteria, _data);

        // Log update events for each record
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const oldRecord = oldRecords[i];

            if (oldRecord) {
                await this.logSystemEvent(
                    dataAccessor,
                    'Updated',
                    // @ts-ignore
                    `user ${dataAccessor.user.login} update ${dataAccessor.entity.name} ${record[this.primaryKey as string]}`,
                    oldRecord,
                    record
                );
            }
        }

        return records.map(record => dataAccessor.process(record));
    }

    public async destroyOne(criteria: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
        // Get the record first for diff
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        const oldRecord = await this._findOne(criteria);

        if (!oldRecord) {
            return null;
        }

        let record = await this._destroyOne(criteria);

        if (!record) {
            return null;
        }

        // Log delete event
        await this.logSystemEvent(
            dataAccessor,
            'Deleted',
            //@ts-ignore
            `user ${dataAccessor.user.login} delete ${dataAccessor.entity.name} ${record[this.primaryKey as string]}`,
            oldRecord,
            {}
        );

        return dataAccessor.process(record);
    }

    public async destroy(criteria: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
        // Get records first for diff
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        const oldRecords = await this._find(criteria);

        let records = await this._destroy(criteria);

        // Log delete events for each record
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const oldRecord = oldRecords[i];

            if (oldRecord) {
                await this.logSystemEvent(
                    dataAccessor,
                    'Deleted',
                    //@ts-ignore
                    `user ${dataAccessor.user.login} delete ${dataAccessor.entity.name} ${record[this.primaryKey as string]}`,
                    oldRecord,
                    {}
                );
            }
        }

        return records.map(record => dataAccessor.process(record));
    }

    public async count(criteria: Partial<T> | undefined, dataAccessor: DataAccessor): Promise<number> {
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
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
