const { main } = require('./src/pwall');

addEventListener('scheduled', event => {
  event.waitUntil(main());
});
