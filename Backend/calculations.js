
/**
 * Retail Expiry Campaigner
 * Deterministic calculations for inventory and customer behaviour.
 */

// Use UTC calendar dates to avoid timezone-related expiry errors.
export function daysUntilExpiry(expDate, today = new Date()) {
  const toUtcDay = (value) => {
    const date =
      value instanceof Date
        ? value
        : new Date(
            typeof value === "string"
              ? value.slice(0, 10) + "T00:00:00Z"
              : value
          );

    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
  };

  return Math.round(
    (toUtcDay(expDate) - toUtcDay(today)) / 86400000
  );
}

export function getStockStatus(batch, today = new Date()) {
  const remaining = Number(batch.quantity_remaining);
  const daysLeft = daysUntilExpiry(batch.exp_date, today);

  if (remaining <= 0) return "DEPLETED";
  if (daysLeft < 0) return "EXPIRED";
  if (daysLeft <= 3) return "NEAR_EXPIRY";

  return "FRESH";
}

export function calculateCustomerMetrics({
  totalPurchases,
  productPurchases,
  daysSinceLastPurchase,
}) {
  return {
    totalPurchases: Number(totalPurchases || 0),
    productPurchases: Number(productPurchases || 0),
    daysSinceLastPurchase:
      daysSinceLastPurchase == null
        ? null
        : Number(daysSinceLastPurchase),
  };
}

export function calculateExpiryUrgency(daysLeft) {
  if (daysLeft < 0) return 0;
  if (daysLeft === 0) return 100;
  if (daysLeft === 1) return 90;
  if (daysLeft === 2) return 75;
  if (daysLeft === 3) return 60;
  if (daysLeft <= 7) return 35;

  return 10;
}

export function calculateDiscount({
  sellingPrice,
  costPrice,
  urgency,
  maxDiscountPercent = 30,
}) {
  const selling = Number(sellingPrice);
  const cost = Number(costPrice);

  if (
    !Number.isFinite(selling) ||
    !Number.isFinite(cost) ||
    selling <= 0 ||
    cost < 0
  ) {
    throw new Error("Invalid product price.");
  }

  // Never recommend a discount that takes the sale price below cost.
  const marginLimit = Math.max(
    0,
    ((selling - cost) / selling) * 100
  );

  const proposedDiscount =
    urgency >= 90 ? 20 :
    urgency >= 75 ? 15 :
    urgency >= 60 ? 10 :
    urgency >= 35 ? 5 : 0;

  const appliedDiscount = Math.min(
    proposedDiscount,
    maxDiscountPercent,
    marginLimit
  );

  const discountAmount =
    Math.round(selling * appliedDiscount) / 100;

  return {
    discountPercentage: Number(appliedDiscount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    discountedPrice: Number(
      (selling - discountAmount).toFixed(2)
    ),
    estimatedMargin: Number(
      (selling - discountAmount - cost).toFixed(2)
    ),
  };
}
