import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AutoIncrement,
    DataType,
} from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes, Optional } from 'sequelize';


@Table({ tableName: 'page', timestamps: true })
export class Page extends Model<
    InferAttributes<Page>,
    InferCreationAttributes<Page>
> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column(DataType.STRING)
    declare title: string;
}
