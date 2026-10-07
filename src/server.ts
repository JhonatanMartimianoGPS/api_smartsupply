import 'dotenv/config'; // must be the first import: loads the .env
import app from './app';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
