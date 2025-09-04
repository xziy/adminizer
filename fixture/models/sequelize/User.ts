import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({ tableName: 'user', timestamps: false })
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {

  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare login: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare fullName?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare passwordHashed?: string;
}

