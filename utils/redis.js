// import { createClient } from 'redis';
const createClient = require('redis').createClient;
const util = require('util');

// Redis
class RedisClient {
  constructor() {
    // this.isConnected = false;
    let client;

    if (process.env.NODE_ENV === 'production') {
      client = createClient({ url: process.env.REDIS_URI });
    } else {
      // connect to default 127.0.0.1:6379
      client = createClient();
    }

    client.connect();

    /*
    // hack to ensure connection before moving on
    while (client.connected === false) {
      //
    }
    */

    client.on('error', (err) => {
      // this.isConnected = false;
      console.log(`${err}`);
    });

    client.on('connect', () => {
      // console.log('In connect'); // SCAFF
      // this.isConnected = true;
      // console.log('this.isConnected =', this.isConnected); // SCAFF
      console.log('connected to redis...');
    });

    /* - algorithm to get updated client connection status.
    const waitConnection = (context) => {
      return new Promise((resolve, reject) => {
        let i = 0;
        const repeatFct = async () => {
          await setTimeout(() => {
            i += 1;
            if (i >= 10) {
              reject();
            } else if (!client.connected) {
              repeatFct();
            } else {
              context.isConnected = true;
              resolve();
            }
          }, 1000);
        };
        repeatFct();
      });
    };

    const ctx = this;

    (async () => {
      await waitConnection(ctx);
    })();
    */

    this.client = client;
    // this.rGet = util.promisify(client.get);
  }

  isAlive() {
    return this.client.isReady;
  }

  async get(key) {
    // const val = await this.rGet.call(this.client, key);
    const val = await this.client.get(key);
    return val;
  }

  async set(key, val, expiration/* seconds */) {
    await this.client.set(key, val, { EX: expiration });
    /* ==========================
    this.client.set(key, val, function (err) {
      if (err) {
        console.log(err.toString());
      } else {
        // set key expiration
        this.client.expire(key, expiration);
      }
    });
    ============================== */
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
// redisClient.isAlive();
module.exports = redisClient;
