import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { APP_ORIGIN, PORT } from "@constants/env";
import connectToDatabase from "@config/db";
import errorHandler from "@middlewares/errorHandler";
import authRoutes from "@routes/auth.route";
import 'module-alias/register';
import { OK } from "./constants/http";

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: APP_ORIGIN,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(errorHandler);

app.get("/", async (req: Request, res: Response, next: NextFunction) => {
    return res.status(OK).json({
      message: "Hello my friends",
    });
});

app.use("/auth", authRoutes)

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectToDatabase();
});
