import {
	Table,
	Column,
	Model,
	PrimaryKey,
	AutoIncrement,
	DataType,
	ForeignKey,
	BelongsTo,
	BelongsToMany,

  } from 'sequelize-typescript';
  import {
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	Sequelize,
	ModelCtor,
	ModelStatic,
  } from 'sequelize';
  import { Example } from './Example';
  import { UserAP }  from  "../../../src/models/UserAP"

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

 	/**
   * Static method to set up model associations dynamically.
   * Call after all models are registered in Sequelize.
   */
	 static associate(sequelize: Sequelize) {

		try {
			const _UserAP = sequelize.model('UserAP') as ModelStatic<Model<UserAP>>;
			this.belongsToMany(_UserAP, {
			  through: 'test_useraps',
			  foreignKey: 'testId',
			  otherKey: 'userAPId',
			  as: 'userAPs',
			});
		} catch (error) {
			console.log(error)
		}
	  }

	declare userAPs: any[];

  }
  