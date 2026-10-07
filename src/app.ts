import express from 'express';
import routes from './routes';
import { tratarErros } from './middlewares/tratar-erros';

const app = express();

app.use(express.json());
app.use(routes);
app.use(tratarErros); // sempre por último

export default app;
