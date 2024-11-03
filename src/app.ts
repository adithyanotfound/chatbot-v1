import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import chatRouter from './routes/chat'


const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// express
const port = 3001;

app.use('/api/v1', chatRouter)

app.use('/', (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`Error: ${err}`);
  res.status(500).send("An internal error occurred.");
});

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to the database");
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  }
};

startServer();