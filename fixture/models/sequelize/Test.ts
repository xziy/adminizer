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
	Sequelize,
	ModelStatic,
  } from 'sequelize';
  import { Example } from './Example';
import { UserAP } from '../../../dist';
import { tr } from '@faker-js/faker/.';
  
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
  
	// ——————————————————————————————————————————————
	// Example (1-to-1)
	// ——————————————————————————————————————————————
	@ForeignKey(() => Example)
	@Column({ type: DataType.INTEGER, allowNull: true })
	declare exampleId: number;
  
	@BelongsTo(() => Example, { foreignKey: 'exampleId', as: 'example' })
	declare example: Example;
  
	// ——————————————————————————————————————————————
	// Owner (1-to-1 with UserAP at runtime)
	// ——————————————————————————————————————————————
	@Column({ type: DataType.INTEGER, allowNull: true })
	declare ownerId: number;
  
	declare owner?: any;
  
	// ——————————————————————————————————————————————
	// Many-to-many с UserAP через `test_useraps`
	// ——————————————————————————————————————————————
	declare userAPs?: UserAP[];
  
	static associate(sequelize: Sequelize) {
	  const UserAPModel = sequelize.model('UserAP') as ModelStatic<Model<UserAP>>;
  
	  // 1-to-1: ownerId → один UserAP
	  this.belongsTo(UserAPModel, {
		foreignKey: 'ownerId',
		as: 'owner',
	  });
  
	  // M-to-N: через таблицу test_useraps
	  this.belongsToMany(UserAPModel, {
		through: 'test_useraps',
		foreignKey: 'testId',
		otherKey: 'userAPId',
		as: 'userAPs',
	  });
	}
  }
  