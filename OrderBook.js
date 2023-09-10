"use-strict";

class OrderBook {
  constructor() {
    this.buyOrders = [];
    this.sellOrders = [];
  }

  setOrders(orders) {
    orders.forEach(item => this.addOrder(item));
  }

  addOrder(order) {
    let matched = false;

    if (order.type === "BUY") {
      matched = this.addBuyOrder(order);
    } else if (order.type === "SELL") {
      matched = this.addSellOrder(order);
    }

    return matched;
  }

  addBuyOrder(buyOrder) {
    let matched = false;
    for (let i = 0; i < this.sellOrders.length; i++) {
      const sellOrder = this.sellOrders[i];

      console.log("Matching sell order", sellOrder);

      if (buyOrder.price >= sellOrder.price) {
        const matchedQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);

        console.log("**Matched buy order**:", buyOrder, "with sell order:", sellOrder);

        buyOrder.quantity -= matchedQuantity;
        sellOrder.quantity -= matchedQuantity;

        if (buyOrder.quantity === 0) {
          this.buyOrders.splice(this.buyOrders.indexOf(buyOrder), 1);
          matched = true;
          break;
        }
      }
    }

    if (!matched && buyOrder.quantity > 0) {
      this.buyOrders.push(buyOrder);
    }

    return matched;
  }

  addSellOrder(sellOrder) {
    let matched = false;
    for (let i = 0; i < this.buyOrders.length; i++) {
      const buyOrder = this.buyOrders[i];

      console.log("Matching buy order", buyOrder);

      if (sellOrder.price <= buyOrder.price) {
        const matchedQuantity = Math.min(sellOrder.quantity, buyOrder.quantity);

        console.log("**Matched sell order**:", sellOrder, "with buy order:", buyOrder);

        sellOrder.quantity -= matchedQuantity;
        buyOrder.quantity -= matchedQuantity;

        if (sellOrder.quantity === 0) {
          this.sellOrders.splice(this.sellOrders.indexOf(sellOrder), 1);
          matched = true;
          break;
        }
      }
    }

    if (!matched && sellOrder.quantity > 0) {
      this.sellOrders.push(sellOrder);
    }

    return matched;
  }

  getOrders() {
    return [
      ...this.buyOrders,
      ...this.sellOrders
    ];
  }
}

module.exports = OrderBook;