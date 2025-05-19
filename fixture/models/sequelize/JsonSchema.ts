import {
	Table,
	Column,
	Model,
	PrimaryKey,
	AutoIncrement,
	DataType,
  } from 'sequelize-typescript';
  import { CreationOptional, InferAttributes, InferCreationAttributes, Optional } from 'sequelize';
  
  
  @Table({ tableName: 'jsonschema', timestamps: true })
  export class JsonSchema extends Model<
 	InferAttributes<JsonSchema>,
	InferCreationAttributes<JsonSchema>
  > {
  
	@PrimaryKey
	@Column({
		type: DataType.UUID,
		defaultValue: DataType.UUIDV4,
	})
	declare id: CreationOptional<string>;
  
	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;
  
	@Column(DataType.JSON)
	declare data: object;
  }
  