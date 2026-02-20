import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({ tableName: "posts" })
export class Post extends Model {
  @Column({ type: DataType.STRING(180), allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare content: string | null;
}
