import { faker } from '@faker-js/faker';
import { generate } from 'password-hash';
export async function seedDatabase(
  collections: Record<string, any>,
  count: number = 3
) {
  const getRandomTime = () => {
    const hours = faker.number.int({ min: 0, max: 23 }).toString().padStart(2, '0');
    const minutes = faker.number.int({ min: 0, max: 59 }).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const exampleModel = collections.example ?? collections.Example;
  const userModel = collections.userap ?? collections.UserAP;
  const groupModel = collections.groupap ?? collections.GroupAP;


  const isSequelize = typeof exampleModel?.bulkCreate === 'function';
  const isWaterline = typeof exampleModel?.createEach === 'function';

  if (!exampleModel || !userModel || !groupModel || (!isSequelize && !isWaterline)) {
    throw new Error('Models should support the ORM interface (Sequelize or Waterline)');
  }

  // ------------------ Example Records ------------------ //
  const exampleCount = isSequelize
    ? await exampleModel.count()
    : await exampleModel.count({});

  if (exampleCount === 0) {
    const fakeExamples = Array.from({ length: count }, () => ({
      title:       faker.lorem.word(),
      description: faker.lorem.paragraph(),
      sort:        faker.datatype.boolean(),
      time:        getRandomTime(),
      number:      faker.number.int(300),
      editor:      faker.lorem.text(),
    }));

    if (isSequelize) {
      await exampleModel.bulkCreate(fakeExamples);
    } else {
      await exampleModel.createEach(fakeExamples);
    }
  }

  // ------------------ Groups ------------------ //
  const groupNames = [
    { name: 'Admins', description: 'System administrators' },
    { name: 'Users', description: 'Registered users' },
    { name: 'Guests', description: 'Guest access' },
  ];

  for (const group of groupNames) {
    const exists = isSequelize
      ? await groupModel.findOne({ where: { name: group.name } })
      : await groupModel.find({ name: group.name });

    if (!exists || (Array.isArray(exists) && exists.length === 0)) {
      if (isSequelize) {
        await groupModel.create(group);
      } else {
        await groupModel.create(group).fetch();
      }
    }
  }

  // ------------------ Users ------------------ //
  const users = [
    { login: 'pass', password: 'pass', fullName: 'User Pass' },
    { login: 'demo', password: 'demo', fullName: 'Administrator', isAdministrator: true },
    { login: 'user1', password: 'user1', fullName: 'User One' },
    { login: 'admin', password: 'admin', fullName: 'Admin User', isAdministrator: true },
    { login: 'user2', password: 'user2', fullName: 'User Two' },
    { login: 'user3', password: 'user3', fullName: 'User Three' },
  ];

  for (const u of users) {
    const exists = isSequelize
      ? await userModel.findOne({ where: { login: u.login } })
      : await userModel.find({ login: u.login });

    if (!exists || (Array.isArray(exists) && exists.length === 0)) {
      const userData = {
        login: u.login,
        password: u.password,
        passwordHashed: generate(u.login+u.password+process.env.AP_PASSWORD_SALT),
        fullName: u.fullName,
        isActive: true,
        isAdministrator: u.isAdministrator || false,
      };

      const userInstance = isSequelize
        ? await userModel.create(userData)
        : await userModel.create(userData).fetch();


      console.log('userInstance: ', userInstance)
      // Привязка к группам (упрощённая логика)
      const groupName = u.isAdministrator ? 'Admins' : 'Users';

      const group = isSequelize
        ? await groupModel.findOne({ where: { name: groupName } })
        : (await groupModel.find({ name: groupName }))[0];

      if (group && group.addUser) {
        await group.addUser(userInstance); // Sequelize M:N
      } else if (isWaterline && group && typeof groupModel.addToCollection === 'function') {
        await groupModel.addToCollection(group.id, 'users', userInstance.id);
      }
    }
  }
}
