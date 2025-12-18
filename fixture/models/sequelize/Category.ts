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
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;


    @Column(DataType.STRING)
    declare title: string;

    @Column(DataType.STRING)
    declare slug: string;

    @Column(DataType.JSON)
    declare mediamanager_one: object

    @Column(DataType.JSON)
    declare mediamanager_two: object

    @Column(DataType.JSON)
    declare single_file: object
}
