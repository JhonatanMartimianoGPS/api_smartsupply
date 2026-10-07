import 'dotenv/config'; // precisa ser o primeiro import: carrega o .env
import app from './app';

const porta = process.env.PORT || 3000;

app.listen(porta, () => {
  console.log(`API rodando em http://localhost:${porta}`);
});
