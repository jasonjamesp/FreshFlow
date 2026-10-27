
import pool from "./db.js";

import {
  daysUntilExpiry,
  calculateExpiryUrgency,
  calculateDiscount,
} from "./calculations.js";

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const MAX_DISCOUNT_PERCENT = 30;
const EXPIRY_WINDOW_DAYS = 7;
const MAX_CAMPAIGNS_PER_BATCH = 3;

function makeCampaignId() {
  return `CA${Date.now().toString(36)}${Math.floor(
    Math.random() * 36
  ).toString(36)}`.slice(0, 12).toUpperCase();
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

// Retained for compatibility with your existing decision rules.
// Gemini determines the action in the AI campaign generation flow.
function decideAction({ urgency, productPurchases, daysSinceLastPurchase }) {
  if (urgency >= 75) {
    return "DISCOUNT";
  }

  if (
    productPurchases >= 2 &&
    daysSinceLastPurchase !== null &&
    daysSinceLastPurchase <= 30
  ) {
    return "NOTIFY";
  }

  if (urgency >= 35) {
    return "BUNDLE";
  }

  return "NOTIFY";
}

function makeReason({
  productName,
  daysLeft,
  remaining,
  action,
  productPurchases,
  discountPercentage,
}) {
  const expiryText =
    daysLeft === 0
      ? "expires today"
      : `expires in ${daysLeft} day(s)`;

  const purchaseText =
    `${productPurchases} previous purchase(s) of this product were found`;

  if (action === "DISCOUNT") {
    return `${productName} ${expiryText}, with ${remaining} unit(s) remaining. ` +
      `${purchaseText}. A ${discountPercentage}% discount is recommended to encourage faster sales.`;
  }

  if (action === "BUNDLE") {
    return `${productName} ${expiryText}, with ${remaining} unit(s) remaining. ` +
      `${purchaseText}. Consider a bundle promotion to move stock before expiry.`;
  }

  return `${productName} ${expiryText}. ${purchaseText}. ` +
    "A targeted reminder is recommended without an automatic discount.";
}

/**
 * Gemini evaluates the supplied inventory and customer evidence.
 * JavaScript validates its decisions and calculates final prices.
 */
async function getAIRecommendations({
  batch,
  candidates,
  daysLeft,
  urgency,
}) {
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY is not configured in Backend/.env."
    );
  }

  const input = {
    product: batch.p_name,
    batchId: batch.batch_id,
    quantityRemaining: Number(batch.quantity_remaining),
    expiryDate: batch.exp_date,
    daysUntilExpiry: daysLeft,
    urgency,
    sellingPrice: Number(batch.selling_price),
    costPrice: Number(batch.cost_price),
    maxDiscountPercent: MAX_DISCOUNT_PERCENT,
    customers: candidates.map((customer) => ({
      customerId: customer.cust_id,
      previousProductPurchases: customer.productPurchases,
      totalPurchases: customer.totalPurchases,
      daysSinceLastProductPurchase: customer.daysSinceLastPurchase,
    })),
  };

  const prompt = `
You are an AI retail expiry campaign strategist.

Analyse the supplied inventory batch and customer purchase evidence.
Choose a suitable campaign strategy for each supplied customer.

Allowed actions:
- NOTIFY: A targeted reminder without a price reduction.
- DISCOUNT: A percentage discount to encourage faster sales.
- BUNDLE: Recommend a bundle promotion without inventing a bundle price.

Decision requirements:
1. Consider expiry urgency, stock remaining, purchase frequency,
   purchase recency, selling price and cost price.
2. Prefer customers with relevant product purchase history when
   supported by the evidence.
3. Do not invent customer preferences or behaviour.
4. Use only customer IDs included in the supplied data.
5. Return exactly one recommendation per supplied customer.
6. For DISCOUNT, propose a percentage greater than zero and no greater
   than ${MAX_DISCOUNT_PERCENT}.
7. Never recommend a discount that reduces the selling price below cost.
8. For NOTIFY and BUNDLE, set discountPercentage to 0.
9. Give a concise reason grounded in the supplied evidence.
10. Write a short, respectful customer-facing promotional message.
11. Return valid JSON only, without Markdown or code fences.

Required response structure:
{
  "recommendations": [
    {
      "customerId": "C001",
      "action": "DISCOUNT",
      "discountPercentage": 10,
      "reason": "Evidence-based explanation",
      "message": "Customer-facing promotional message"
    }
  ]
}

Inventory and customer data:
${JSON.stringify(input)}
`;

  let response;
  let useFallback = false;
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      break; // Success, exit retry loop
    } catch (error) {
      if (attempt === maxRetries) {
        console.warn(`Gemini API completely failed after ${maxRetries} attempts: ${error.message}. Using deterministic fallback.`);
        useFallback = true;
        break;
      }
      console.warn(`Gemini API call failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying...`);
      // Exponential backoff: 2s, 4s
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }

  let result;
  if (useFallback) {
    result = {
      recommendations: candidates.map((c) => {
        const action = decideAction({
          urgency,
          productPurchases: c.productPurchases,
          daysSinceLastPurchase: c.daysSinceLastPurchase,
        });
        const discountPercentage = action === "DISCOUNT" 
          ? calculateDiscount({
              sellingPrice: Number(batch.selling_price),
              costPrice: Number(batch.cost_price),
              urgency,
              maxDiscountPercent: MAX_DISCOUNT_PERCENT
            })
          : 0;
        return {
          customerId: c.cust_id,
          action,
          discountPercentage,
          reason: "(Fallback Mode) " + makeReason({
            productName: batch.p_name,
            daysLeft,
            remaining: batch.quantity_remaining,
            action,
            productPurchases: c.productPurchases,
            discountPercentage
          }),
          message: action === "DISCOUNT" 
            ? `Special offer! Get ${discountPercentage}% off ${batch.p_name} today.`
            : `Don't forget to pick up ${batch.p_name} on your next visit!`
        };
      })
    };
  } else {
    try {
      result = JSON.parse(response.text);
    } catch {
      throw new Error("Gemini returned invalid recommendation JSON.");
    }
  }

  if (!Array.isArray(result.recommendations)) {
    throw new Error(
      "Gemini response has no recommendations array."
    );
  }

  const allowedIds = new Set(
    candidates.map((customer) => customer.cust_id)
  );

  const validated = new Map();

  const sellingPrice = Number(batch.selling_price);
  const costPrice = Number(batch.cost_price);

  if (
    !Number.isFinite(sellingPrice) ||
    !Number.isFinite(costPrice) ||
    sellingPrice <= 0 ||
    costPrice < 0
  ) {
    throw new Error(
      `Invalid selling price or cost price for product ${batch.p_id}.`
    );
  }

  const marginLimit = Math.max(
    0,
    ((sellingPrice - costPrice) / sellingPrice) * 100
  );

  for (const item of result.recommendations) {
    if (!item || !allowedIds.has(item.customerId)) {
      continue;
    }

    if (validated.has(item.customerId)) {
      continue;
    }

    if (!["NOTIFY", "DISCOUNT", "BUNDLE"].includes(item.action)) {
      continue;
    }

    const requestedDiscount = Number(item.discountPercentage);

    if (
      !Number.isFinite(requestedDiscount) ||
      requestedDiscount < 0 ||
      requestedDiscount > MAX_DISCOUNT_PERCENT
    ) {
      continue;
    }

    if (
      typeof item.reason !== "string" ||
      item.reason.trim().length === 0 ||
      typeof item.message !== "string" ||
      item.message.trim().length === 0
    ) {
      continue;
    }

    if (
      item.action === "DISCOUNT" &&
      (requestedDiscount <= 0 || marginLimit <= 0)
    ) {
      continue;
    }

    if (
      item.action !== "DISCOUNT" &&
      requestedDiscount !== 0
    ) {
      continue;
    }

    // Apply the actual discount cap independently of Gemini.
    const discountPercentage =
      item.action === "DISCOUNT"
        ? Math.min(requestedDiscount, marginLimit)
        : 0;

    const discountAmount = roundMoney(
      sellingPrice * discountPercentage / 100
    );

    const discountedPrice = roundMoney(
      sellingPrice - discountAmount
    );

    const estimatedMargin = roundMoney(
      discountedPrice - costPrice
    );

    // Final price safety check.
    if (
      discountedPrice < costPrice ||
      estimatedMargin < 0
    ) {
      continue;
    }

    validated.set(item.customerId, {
      action: item.action,
      discountPercentage: Number(
        discountPercentage.toFixed(2)
      ),
      discountAmount,
      discountedPrice,
      estimatedMargin,
      reason: item.reason.trim().slice(0, 500),
      message: item.message.trim().slice(0, 1000),
    });
  }

  return validated;
}

export async function generateCampaigns() {
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY is not configured in Backend/.env."
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Only batches with stock that have not expired.
    const [batches] = await connection.query(
      `SELECT
         b.batch_id,
         b.p_id,
         b.quantity_remaining,
         DATE_FORMAT(b.exp_date, '%Y-%m-%d') AS exp_date,
         p.p_name,
         p.cost_price,
         p.selling_price
       FROM inventory_batch b
       JOIN products p ON p.p_id = b.p_id
       WHERE b.quantity_remaining > 0
         AND b.exp_date >= CURDATE()
         AND b.exp_date <= DATE_ADD(
           CURDATE(), INTERVAL ? DAY
         )
       ORDER BY b.exp_date ASC, b.quantity_remaining DESC`,
      [EXPIRY_WINDOW_DAYS]
    );

    const createdCampaigns = [];
    const skippedBatches = [];

    for (const batch of batches) {
      const daysLeft = daysUntilExpiry(batch.exp_date);

      if (
        daysLeft < 0 ||
        Number(batch.quantity_remaining) <= 0
      ) {
        continue;
      }

      const urgency = calculateExpiryUrgency(daysLeft);

      // Calculate purchase metrics from the actual purchase tables.
      const [customers] = await connection.query(
        `SELECT
           c.cust_id,
           c.name,
           c.email,
           COUNT(DISTINCT pu.inv_no) AS total_purchases,
           COUNT(DISTINCT CASE
             WHEN ip.p_id = ? THEN pu.inv_no
           END) AS product_purchases,
           MAX(CASE
             WHEN ip.p_id = ? THEN pu.purchase_date
           END) AS last_product_purchase
         FROM customer c
         LEFT JOIN purchase pu
           ON pu.cust_id = c.cust_id
         LEFT JOIN individual_purchase ip
           ON ip.inv_no = pu.inv_no
         GROUP BY c.cust_id, c.name, c.email`,
        [batch.p_id, batch.p_id]
      );

      const eligibleCustomers = customers
        .map((customer) => {
          const productPurchases = Number(
            customer.product_purchases || 0
          );

          const totalPurchases = Number(
            customer.total_purchases || 0
          );

          const lastPurchase = customer.last_product_purchase
            ? new Date(customer.last_product_purchase)
            : null;

          const daysSinceLastPurchase = lastPurchase
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - lastPurchase.getTime()) /
                    86400000
                )
              )
            : null;

          return {
            ...customer,
            productPurchases,
            totalPurchases,
            daysSinceLastPurchase,
          };
        })
        .filter((customer) => customer.email)
        .sort((a, b) => {
          if (b.productPurchases !== a.productPurchases) {
            return b.productPurchases - a.productPurchases;
          }

          const aDays = a.daysSinceLastPurchase ?? 9999;
          const bDays = b.daysSinceLastPurchase ?? 9999;

          if (aDays !== bDays) {
            return aDays - bDays;
          }

          return b.totalPurchases - a.totalPurchases;
        });

      // Exclude customers who already have active campaigns.
      const campaignCandidates = [];

      for (const customer of eligibleCustomers) {
        if (
          campaignCandidates.length >= MAX_CAMPAIGNS_PER_BATCH
        ) {
          break;
        }

        const [existing] = await connection.query(
          `SELECT d_id
           FROM campaign
           WHERE batch_id = ?
             AND cust_id = ?
             AND status IN ('DRAFT', 'APPROVED', 'SENT')
           LIMIT 1`,
          [batch.batch_id, customer.cust_id]
        );

        if (existing.length === 0) {
          campaignCandidates.push(customer);
        }
      }

      if (campaignCandidates.length === 0) {
        skippedBatches.push({
          batchId: batch.batch_id,
          productName: batch.p_name,
          reason:
            "No eligible customer found or active campaigns already exist.",
        });

        continue;
      }

      // Gemini chooses the campaign strategy and creates the copy.
      const aiRecommendations = await getAIRecommendations({
        batch,
        candidates: campaignCandidates,
        daysLeft,
        urgency,
      });

      let createdForBatch = 0;

      for (const customer of campaignCandidates) {
        if (
          createdForBatch >= MAX_CAMPAIGNS_PER_BATCH
        ) {
          break;
        }

        const recommendation = aiRecommendations.get(
          customer.cust_id
        );

        // Do not invent a fallback AI recommendation.
        if (!recommendation) {
          continue;
        }

        const {
          action,
          discountPercentage,
          discountAmount,
          discountedPrice,
          estimatedMargin,
          reason,
          message,
        } = recommendation;

        const expiryDate = new Date(
          `${batch.exp_date}T23:59:59`
        );

        const oneDayFromNow = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        );

        const validUntil = new Date(
          Math.min(
            oneDayFromNow.getTime(),
            expiryDate.getTime()
          )
        );

        if (Number.isNaN(validUntil.getTime())) {
          throw new Error(
            `Invalid expiry date for batch ${batch.batch_id}`
          );
        }

        const campaignId = makeCampaignId();

        await connection.query(
          `INSERT INTO campaign (
             d_id,
             cust_id,
             p_id,
             batch_id,
             discount_percentage,
             discount_amount,
             reason,
             ai_message,
             valid_until,
             status,
             action
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
          [
            campaignId,
            customer.cust_id,
            batch.p_id,
            batch.batch_id,
            discountPercentage,
            discountAmount,
            reason,
            message,
            validUntil,
            action,
          ]
        );

        createdCampaigns.push({
          campaignId,
          customerId: customer.cust_id,
          customerName: customer.name,
          productId: batch.p_id,
          productName: batch.p_name,
          batchId: batch.batch_id,
          quantityRemaining: Number(
            batch.quantity_remaining
          ),
          expiryDate: batch.exp_date,
          daysUntilExpiry: daysLeft,
          urgency,
          action,
          discountPercentage,
          discountAmount,
          discountedPrice,
          estimatedMargin,
          reason,
          aiMessage: message,
          status: "DRAFT",
        });

        createdForBatch++;
      }

      if (createdForBatch === 0) {
        skippedBatches.push({
          batchId: batch.batch_id,
          productName: batch.p_name,
          reason:
            "Gemini returned no valid recommendations for this batch.",
        });
      }
    }

    await connection.commit();

    return {
      success: true,
      batchesEvaluated: batches.length,
      campaignsCreated: createdCampaigns.length,
      campaigns: createdCampaigns,
      skippedBatches,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
