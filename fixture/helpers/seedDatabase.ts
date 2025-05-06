import { faker } from '@faker-js/faker';
import { generate } from 'password-hash'; // путь к вашей функции generate()

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

  const isSequelize = typeof exampleModel?.bulkCreate === 'function';
  const isWaterline = typeof exampleModel?.createEach === 'function';

  if (!exampleModel || !userModel || (!isSequelize && !isWaterline)) {
    throw new Error('Модели должны поддерживать ORM-интерфейс (Sequelize или Waterline)');
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
        passwordHashed: generate(u.password),
        fullName: u.fullName,
        isActive: true,
        isAdministrator: u.isAdministrator || false,
      };

      if (isSequelize) {
        await userModel.create(userData);
      } else {
        await userModel.create(userData);
      }
    }
  }
}
