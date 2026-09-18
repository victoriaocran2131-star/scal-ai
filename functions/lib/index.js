"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReceiptOnPurchase = exports.getAdminStats = exports.validateReceipt = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const APPLE_VERIFY_RECEIPT_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_RECEIPT_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
async function verifyReceiptWithApple(receiptData, isSandbox = false) {
    var _a;
    const url = isSandbox ? APPLE_SANDBOX_RECEIPT_URL : APPLE_VERIFY_RECEIPT_URL;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "receipt-data": receiptData,
            password: ((_a = functions.config().apple) === null || _a === void 0 ? void 0 : _a.shared_secret) || "",
        }),
    });
    return response.json();
}
function getSubscriptionEndDate(productId, purchaseDateMs) {
    const purchaseDate = new Date(parseInt(purchaseDateMs));
    const endDate = new Date(purchaseDate);
    if (productId.includes("weekly")) {
        endDate.setDate(endDate.getDate() + 7);
    }
    else if (productId.includes("monthly")) {
        endDate.setMonth(endDate.getMonth() + 1);
    }
    else if (productId.includes("yearly")) {
        endDate.setFullYear(endDate.getFullYear() + 1);
    }
    else {
        endDate.setMonth(endDate.getMonth() + 1);
    }
    return endDate;
}
exports.validateReceipt = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { receiptData } = data;
    if (!receiptData) {
        throw new functions.https.HttpsError("invalid-argument", "Receipt data is required");
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
        const endDate = getSubscriptionEndDate(activeReceipt.product_id, activeReceipt.purchase_date_ms);
        let plan = "monthly";
        if (activeReceipt.product_id.includes("weekly")) {
            plan = "weekly";
        }
        else if (activeReceipt.product_id.includes("yearly")) {
            plan = "yearly";
        }
        await db.collection("users").doc(uid).set({
            appleReceiptData: receiptData,
        }, { merge: true });
        await db.collection("users").doc(uid).collection("subscription").doc("current").set({
            plan,
            startDate: admin.firestore.Timestamp.fromDate(new Date(parseInt(activeReceipt.purchase_date_ms))),
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
    }
    catch (error) {
        console.error("Receipt validation error:", error);
        return {
            success: false,
            error: error.message || "Failed to validate receipt",
        };
    }
});
const ADMIN_EMAIL = "ocranv13@gmail.com";
function isAdminEmail(email) {
    return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
exports.getAdminStats = functions.https.onCall(async (data, context) => {
    var _a, _b;
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
    const recentUsers = [];
    for (const doc of usersSnap.docs) {
        const data = doc.data();
        if (data.hasActiveSubscription)
            activeSubscriptions++;
        if (recentUsers.length < 5) {
            recentUsers.push({
                email: data.email || "Unknown",
                date: ((_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a))
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
exports.validateReceiptOnPurchase = functions.firestore
    .document("users/{userId}/subscription/current")
    .onWrite(async (change, context) => {
    var _a;
    const uid = context.params.userId;
    const subscriptionData = change.after.data();
    if (!subscriptionData || !subscriptionData.appleTransactionId) {
        return;
    }
    const lastValidated = (_a = subscriptionData.lastValidatedAt) === null || _a === void 0 ? void 0 : _a.toDate();
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
        if (!(userData === null || userData === void 0 ? void 0 : userData.appleReceiptData)) {
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
                const endDate = getSubscriptionEndDate(activeReceipt.product_id, activeReceipt.purchase_date_ms);
                await db
                    .collection("users")
                    .doc(uid)
                    .collection("subscription")
                    .doc("current")
                    .update({
                    endDate: admin.firestore.Timestamp.fromDate(endDate),
                    lastValidatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
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
    }
    catch (error) {
        functions.logger.error("Background validation error:", error);
    }
});
//# sourceMappingURL=index.js.map