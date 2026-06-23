// import cors from "cors";
// import dotenv from "dotenv";
// import express from "express";
// import helmet from "helmet";
// import { errorHandler } from "./middlewares/error.middleware"
// import routes from "./routes";
// import 'dotenv/config';



// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(helmet());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use("/api", routes);

// // Error handling
// app.use(errorHandler);

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });


import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middlewares/error.middleware";
import routes from "./routes";
import { testDatabaseConnection } from './config/database';


testDatabaseConnection();

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;