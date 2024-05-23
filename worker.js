const { main } = require('./pwall');

addEventListener('scheduled', event => {
  event.waitUntil(main());
});
