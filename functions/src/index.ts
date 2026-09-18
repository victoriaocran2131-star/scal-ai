import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

const APPLE_VERIFY_RECEIPT_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_RECEIPT_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

interface AppleReceiptResponse {
  status: number;
  receipt?: {
    bundle_id: string;
    in_app: Array<{
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date_ms: string;
      expires_date_ms: string;
      is_trial_period: string;
    }>;
  };
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    purchase_date_ms: string;
    expires_date_ms: string;
    is_trial_period: string;
  }>;
}

async function verifyReceiptWithApple(
  receiptData: string,
  isSandbox: boolean = false
): Promise<AppleReceiptResponse> {
  const url = isSandbox ? APPLE_SANDBOX_RECEIPT_URL : APPLE_VERIFY_RECEIPT_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "receipt-data": receiptData,
      password: functions.config().apple?.shared_secret || "",
    }),
  });

  return response.json() as Promise<AppleReceiptResponse>;
}

function getSubscriptionEndDate(
  productId: string,
  purchaseDateMs: string
): Date {
  const purchaseDate = new Date(parseInt(purchaseDateMs));
  const endDate = new Date(purchaseDate);

  if (productId.includes("weekly")) {
    endDate.setDate(endDate.getDate() + 7);
  } else if (productId.includes("monthly")) {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (productId.includes("yearly")) {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate;
}

export const validateReceipt = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { receiptData } = data;
  if (!receiptData) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Receipt data is required"
    );
  }

  const uid = context.auth.uid;

  try {
    let result = await verifyReceiptWithApple(receiptData, false);

    if (result.status === 21007) {
      result = await verifyReceiptWithApple(receiptData, true);
    }

    if (result.status !== 0) {
      return {
        success: false,
        error: `Apple verification failed with status: ${result.status}`,
      };
    }

    const latestReceipts = result.latest_receipt_info || [];
    const activeReceipt = latestReceipts.find((receipt) => {
      const expiresDate = new Date(parseInt(receipt.expires_date_ms));
      return expiresDate > new Date();
    });

    if (!activeReceipt) {
      return {
        success: false,
        error: "No active subscription found",
      };
    }

    const endDate = getSubscriptionEndDate(
      activeReceipt.product_id,
      activeReceipt.purchase_date_ms
    );

    let plan = "monthly";
    if (activeReceipt.product_id.includes("weekly")) {
      plan = "weekly";
    } else if (activeReceipt.product_id.includes("yearly")) {
      plan = "yearly";
    }

    await db.collection("users").doc(uid).set({
      appleReceiptData: receiptData,
    }, { merge: true });

    await db.collection("users").doc(uid).collection("subscription").doc("current").set({
      plan,
      startDate: admin.firestore.Timestamp.fromDate(
        new Date(parseInt(activeReceipt.purchase_date_ms))
      ),
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      appleTransactionId: activeReceipt.transaction_id,
      originalTransactionId: activeReceipt.original_transaction_id,
      productId: activeReceipt.product_id,
      isTrialPeriod: activeReceipt.is_trial_period === "true",
      validatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastValidatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      subscription: {
        plan,
        endDate: endDate.toISOString(),
        productId: activeReceipt.product_id,
        isTrialPeriod: activeReceipt.is_trial_period === "true",
      },
    };
  } catch (error: any) {
    console.error("Receipt validation error:", error);
    return {
      success: false,
      error: error.message || "Failed to validate receipt",
    };
  }
});

const ADMIN_EMAIL = "ocranv13@gmail.com";

function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export const getAdminStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();
  if (!userData || !isAdminEmail(userData.email || "")) {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }

  const usersSnap = await db.collection("users").get();
  const totalUsers = usersSnap.size;

  let activeSubscriptions = 0;
  const recentUsers: Array<{ email: string; date: string }> = [];

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.hasActiveSubscription) activeSubscriptions++;

    if (recentUsers.length < 5) {
      recentUsers.push({
        email: data.email || "Unknown",
        date: data.createdAt?.toDate?.()
          ? data.createdAt.toDate().toISOString().split("T")[0]
          : "Unknown",
      });
    }
  }

  recentUsers.sort((a, b) => b.date.localeCompare(a.date));

  return {
    totalUsers,
    activeSubscriptions,
    totalScans: totalUsers * 3,
    recentUsers: recentUsers.slice(0, 5),
  };
});

export const validateReceiptOnPurchase = functions.firestore
  .document("users/{userId}/subscription/current")
  .onWrite(async (change, context) => {
    const uid = context.params.userId;
    const subscriptionData = change.after.data();

    if (!subscriptionData || !subscriptionData.appleTransactionId) {
      return;
    }

    const lastValidated = subscriptionData.lastValidatedAt?.toDate();
    const now = new Date();
    const hoursSinceLastValidation = lastValidated
      ? (now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60)
      : 25;

    if (hoursSinceLastValidation < 24) {
      return;
    }

    try {
      const userDoc = await db.collection("users").doc(uid).get();
      const userData = userDoc.data();

      if (!userData?.appleReceiptData) {
        functions.logger.warn(`No appleReceiptData found for user ${uid}, skipping background re-validation`);
        return;
      }

      let result = await verifyReceiptWithApple(userData.appleReceiptData, false);

      if (result.status === 21007) {
        result = await verifyReceiptWithApple(userData.appleReceiptData, true);
      }

      if (result.status === 0) {
        const latestReceipts = result.latest_receipt_info || [];
        const activeReceipt = latestReceipts.find((receipt) => {
          const expiresDate = new Date(parseInt(receipt.expires_date_ms));
          return expiresDate > new Date();
        });

        if (activeReceipt) {
          const endDate = getSubscriptionEndDate(
            activeReceipt.product_id,
            activeReceipt.purchase_date_ms
          );

          await db
            .collection("users")
            .doc(uid)
            .collection("subscription")
            .doc("current")
            .update({
              endDate: admin.firestore.Timestamp.fromDate(endDate),
              lastValidatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
          await db
            .collection("users")
            .doc(uid)
            .collection("subscription")
            .doc("current")
            .update({
              endDate: admin.firestore.Timestamp.fromDate(new Date()),
              lastValidatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
      }
    } catch (error) {
      functions.logger.error("Background validation error:", error);
    }
  });
