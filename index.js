"use strict";

const { PeerRPCServer, PeerRPCClient } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");
const { setTimeout } = require("timers/promises");

const OrderBook = require("./OrderBook");
const Lock = require("./Lock");

const link = new Link({
  grape: `http://127.0.0.1:30001`
});
link.start();

const peerServer = new PeerRPCServer(link, { timeout: 300000 });
peerServer.init();
const peerClient = new PeerRPCClient(link, {});
peerClient.init();

const service = peerServer.transport("server");

const port = 1024 + Math.floor(Math.random() * 1000);
const client = `127.0.0.1:${port}`;

service.listen(port);

console.log(`Client listening on port ${port}`);

const orderBook = new OrderBook();
const lock = new Lock();

service.on("request", (rid, key, payload, handler) => {
  switch (key) {
    case "lockOthers":
      lock.lockClient(payload);
      handler.reply(null, { result: 'success' });

      break;
    case "unlockOthers":
      lock.unlockClient(payload);
      handler.reply(null, { result: 'success' });

      break;
    case "getOrders":
      handler.reply(null, { orderBook: orderBook.getOrders() });

      break;
    case "newOrder":
      const order = {
        ...payload,
        id: rid
      };
      const matched = orderBook.addOrder(order);

      if (matched) {
        handler.reply(null, { result: 'success' });
      }
      break;
    default:
      break;
  }
});

const lockOthers = async (client) => {
  return new Promise((resolve, reject) => {
    console.log("Locking...");

    peerClient.map("lockOthers", client, { timeout: 10000 }, (err) => {
      if (err) {
        if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
          resolve();
          return;
        } else {
          reject(err);
          return;
        }
      }
      resolve();
    });
  });
};

const unlockOthers = async (client) => {
  return new Promise((resolve, reject) => {
    console.log("Unlocking...");

    peerClient.map("unlockOthers", client, { timeout: 10000 }, (err) => {
      if (err) {
        if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
          resolve();
          return;
        } else {

          reject(err);
          return;
        }
      }
      resolve();
    });
  });
};

const addClient = async (client) => {
  let count = 0;
  let found = false;

  do {
    try {
      await new Promise((resolve, reject) => {
        link.lookup("newOrder", { timeout: 10000 }, (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          found = data.includes(client);
          resolve();
        });
      });
    } catch (e) {
      console.log(e.message);
    }

    count++;
    await setTimeout(10000);
  } while (!found && count < 200);

  if (!found) {
    throw new Error("Unable to find client registered on the Grape");
  }
};

const getOrders = async () => {
  return new Promise((resolve, reject) => {
    peerClient.request("getOrders", {}, { timeout: 10000 }, (err, data) => {
      if (err) {
        if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
          resolve();
          return;
        } else {
          reject(err);
          return;
        }
      }

      orderBook.setOrders(data.orderBook);
      resolve();
    });
  });
};

const submitNewOrder = async (price, quantity, type) => {
  while (lock.isLocked()) {
    console.log("Releasing Lock...");
    await setTimeout(100);
  }

  return new Promise((resolve, reject) => {
    console.log("Submit new order:", price, quantity, type);

    peerClient.map("newOrder", { price, quantity, type }, { timeout: 10000 }, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

const submitNewOrders = async () => {
  try {
    const random = Math.random();

    await setTimeout(1000 + Math.floor(random * 9000));
    await submitNewOrder(
      parseFloat((100 + random * 10).toFixed(2)), // price
      parseFloat((random > 0.5 ? random / 2 : random).toFixed(2)),  // quantity
      random > 0.5 ? 'BUY' : 'SELL' // type
    );
  } catch (e) {
    console.error(e.message);
  }

  submitNewOrders();
};

(async () => {
  try {
    await lockOthers(client);

    link.startAnnouncing("newOrder", service.port, {});
    link.startAnnouncing("lockOthers", service.port, {});
    link.startAnnouncing("unlockOthers", service.port, {});

    await addClient(client);
    await getOrders();
    await unlockOthers(client);

    link.startAnnouncing("getOrders", service.port, {});

    submitNewOrders();
  } catch (e) {
    console.error("Error while starting client", e);
    process.exit(1);
  }
})();


process.on("SIGINT", async () => {
  console.log("Please wait for closing...");

  link.stopAnnouncing("newOrder", service.port);
  link.stopAnnouncing("getOrders", service.port);

  link.stop();

  await setTimeout(1000);
  process.exit(0);
});
