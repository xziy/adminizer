import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AutoIncrement,
    DataType,
} from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes, Optional } from 'sequelize';


@Table({ tableName: 'category', timestamps: true })
export class Category extends Model<
    InferAttributes<Category>,
    InferCreationAttributes<Category>
> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column(DataType.STRING)
    declare title: string;

    @Column(DataType.STRING)
    declare slug: string;

    @Column(DataType.JSON)
    declare mediamanager_one: object
}
