import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AutoIncrement,
    DataType,
} from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes, Optional } from 'sequelize';

@Table({ tableName: 'testcatalog', timestamps: false })
export class TestCatalog extends Model<
    InferAttributes<TestCatalog>,
    InferCreationAttributes<TestCatalog>
> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column(DataType.JSON)
    declare tree: object;

}