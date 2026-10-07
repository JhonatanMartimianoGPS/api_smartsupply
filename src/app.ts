import express from 'express';
import routes from './routes';
import { errorHandler } from './middlewares/error-handler';

const app = express();

app.use(express.json());
app.use(routes);
app.use(errorHandler); // always last

export default app;
