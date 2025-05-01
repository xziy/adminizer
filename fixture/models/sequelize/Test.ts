import {
	Table,
	Column,
	Model,
	PrimaryKey,
	AutoIncrement,
	DataType,
	ForeignKey,
	BelongsTo,
  } from 'sequelize-typescript';
  import {
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
  } from 'sequelize';
  import { Example } from './Example';
  
  @Table({ tableName: 'test', timestamps: true })
  export class Test extends Model<
	InferAttributes<Test>,
	InferCreationAttributes<Test>
  > {
  
	@PrimaryKey
	@AutoIncrement
	@Column(DataType.INTEGER)
	declare id: CreationOptional<number>;
  
	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;
  
	@ForeignKey(() => Example)
	@Column(DataType.INTEGER)
	declare owner: number;
  
	@BelongsTo(() => Example)
	declare example: Example;
  }
  