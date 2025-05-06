import { Model as SequelizeModel } from 'sequelize';
import { WaterlineModel } from '../../dist';
import { faker } from '@faker-js/faker';

export async function seedDatabase(
  collections: Record<string, any>,
  count: number = 3
) {
  const getRandomTime = () => {
    const hours = faker.number.int({ min: 0, max: 23 }).toString().padStart(2, '0');
    const minutes = faker.number.int({ min: 0, max: 59 }).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const exampleModel = collections.example;
  if (!exampleModel) {
    return;
  }

  // We determine with which ORM we work
  const isSequelize = typeof exampleModel.bulkCreate === 'function';
  const isWaterline = typeof exampleModel.createEach === 'function';

  if (!isSequelize && !isWaterline) {
    throw new Error('Модель не поддерживает ни bulkCreate (Sequelize), ни createEach (Waterline)');
  }

  let existingCount: number;
  if (isSequelize) {
    // For Sequelize Count () without arguments he will count all the notes
    // @ts-ignore
    existingCount = await (exampleModel as SequelizeModel<any, any>).count();
  } else {
    // For Waterline Count ({}) -also all notes
    existingCount = await (exampleModel as WaterlineModel<typeof exampleModel>).count({});
  }
  //if empty -generate and insert "fixtures"
  if (existingCount === 0) {
    const fakeExamples = Array.from({ length: count }, () => ({
      title:       faker.lorem.word(),
      description: faker.lorem.paragraph(),
      sort:        faker.datatype.boolean(),
      time:        getRandomTime(),
      number:      faker.number.int(300),
      editor:      faker.lorem.text(),
    }));

    if (isSequelize) {
      // @ts-ignore
      await (exampleModel as SequelizeModel<any, any>).bulkCreate(fakeExamples);
    } else {
      // @ts-ignore
      await (exampleModel as WaterlineModel<typeof exampleModel>).createEach(fakeExamples);
    }
  }

  if (process.env.DEMO) {
    process.env.ADMINPANEL_DEMO_ADMIN_ENABLE = '1';
  }
}
