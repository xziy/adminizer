import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type Sequelize } from "sequelize";

export class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
  declare id: number;
  declare title: string;
  declare content: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

export function initPostModel(sequelize: Sequelize) {
  Post.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: DataTypes.STRING(180),
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "posts",
      modelName: "Post"
    }
  );

  return Post;
}
