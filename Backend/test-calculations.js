
import {
  calculateExpiryUrgency,
  calculateDiscount,
  getStockStatus,
} from "calculations.js";

console.log("Urgency for 1 day remaining:");
console.log(calculateExpiryUrgency(1));

console.log("\nDiscount for a product:");
console.log(
  calculateDiscount({
    sellingPrice: 35,
    costPrice: 25,
    urgency: 90,
  })
);

console.log("\nStock status:");
console.log(
  getStockStatus({
    quantity_remaining: 30,
    exp_date: new Date().toISOString().slice(0, 10),
  })
);
