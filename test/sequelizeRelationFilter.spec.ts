import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { Sequelize, DataTypes, Op } from "sequelize";
import { SequelizeModel } from "../src/lib/model/adapter/sequelize";

describe("Sequelize relation filters", () => {
  let sequelize: Sequelize;
  let userModel: SequelizeModel<any>;
  let profileModel: SequelizeModel<any>;

  beforeAll(async () => {
    sequelize = new Sequelize("sqlite::memory:", { logging: false });

    const User = sequelize.define("User", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: DataTypes.STRING
    });

    const Profile = sequelize.define("Profile", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      label: DataTypes.STRING,
      userId: DataTypes.INTEGER
    });

    User.hasMany(Profile, { as: "profiles", foreignKey: "userId" });
    Profile.belongsTo(User, { as: "user", foreignKey: "userId" });

    userModel = new SequelizeModel("User", User);
    profileModel = new SequelizeModel("Profile", Profile);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it("adds includes and where clauses for hasMany relation filters", () => {
    const criteria = {
      where: {
        _relation: {
          name: "profiles",
          field: "label",
          condition: { contains: "alpha" }
        }
      }
    };

    const result = userModel._convertWaterlineCriteriaToSequelizeOptions(criteria);

    expect(result.include).toEqual([{ association: "profiles", required: false }]);
    expect(result.where).toHaveProperty("$profiles.label$");
    expect(result.where["$profiles.label$"][Op.like]).toBe("%alpha%");
  });

  it("adds includes and where clauses for belongsTo relation filters", () => {
    const criteria = {
      where: {
        _relation: {
          name: "user",
          field: "name",
          condition: { ilike: "%bob%" }
        }
      }
    };

    const result = profileModel._convertWaterlineCriteriaToSequelizeOptions(criteria);

    expect(result.include).toEqual([{ association: "user", required: false }]);
    expect(result.where).toHaveProperty("$user.name$");
    expect(result.where["$user.name$"][Op.like]).toBe("%bob%");
  });

  it("supports raw SQL conditions", () => {
    const criteria = {
      where: {
        __rawSQL: {
          sql: "name = ?",
          params: ["Alice"]
        }
      }
    };

    const result = userModel._convertWaterlineCriteriaToSequelizeOptions(criteria);

    expect(result.where[Op.and]).toHaveLength(1);
    expect(result.where[Op.and][0].val).toBe("name = 'Alice'");
  });
});
