import {
	Table,
	Column,
	Model,
	PrimaryKey,
	AutoIncrement,
	DataType,
  } from 'sequelize-typescript';
  import { InferAttributes, InferCreationAttributes, Optional } from 'sequelize';
  
  
  @Table({ tableName: 'jsonschema', timestamps: true })
  export class JsonSchema extends Model<
 	InferAttributes<JsonSchema>,
	InferCreationAttributes<JsonSchema>
  > {
  
	@PrimaryKey
	@AutoIncrement
	@Column(DataType.INTEGER)
	declare id: number;
  
	@Column(DataType.JSON)
	declare data: object;
  
	@Column(DataType.JSON)
	declare data2: object;
  }
  