"use strict";

class Lock {
  lockClients = new Set();

  constructor() {}

  lockClient(client) {
    this.lockClients.add(client);
  }

  unlockClient(client) {
    this.lockClients.delete(client);
  }

  isLocked() {
    return this.lockClients.size > 0;
  }
}

module.exports = Lock;
