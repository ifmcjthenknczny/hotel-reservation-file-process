import mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';

let mongoConnection: mongoose.mongo.Db | undefined = undefined;

const mongo = async (configService: ConfigService) => {
  if (mongoConnection) {
    return mongoConnection;
  }
  try {
    await mongoose.connect(configService.get<string>('MONGO_URI')!, {
      dbName: configService.get<string>('DATABASE_NAME'),
      serverSelectionTimeoutMS: 5000,
    });
    mongoConnection = mongoose.connection.db;
    return mongoConnection;
  } catch (err: any) {
    console.error(`Problem connecting with mongo: ${err}`);
  }
};

export default mongo;
