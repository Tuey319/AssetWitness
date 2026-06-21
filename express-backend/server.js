const app    = require('./src/app');
const config = require('./src/config');

app.listen(config.port, () => {
  console.log(`RoomWitness Express backend running on http://localhost:${config.port}`);
});
