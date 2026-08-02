import app from './src/app';
import { config } from './src/config';

app.listen(config.port, () => {
  console.log(`AssetWitness Express backend running on http://localhost:${config.port}`);
});
