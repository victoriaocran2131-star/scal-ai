const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

// Paystack webhook handler
exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
  // Verify Paystack signature (important for security)
  const crypto = require("crypto");
  const secretKey = "sk_live_d3558a0f29e9e8e2a8593ba913a69fbda3c0b64d";
  
  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(JSON.stringify(req.body))
    .digest("hex");
  
  if (hash !== req.headers["x-paystack-signature"]) {
    console.error("Invalid Paystack signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = req.body;

  // Handle successful payment
  if (event.event === "charge.success") {
    const metadata = event.data.metadata;
    const userId = metadata.user_id;
    const billing = metadata.billing;

    if (!userId || !billing) {
      console.error("Missing metadata:", metadata);
      return res.status(400).json({ error: "Missing metadata" });
    }

    // Calculate subscription duration
    const pricing = { weekly: 7, monthly: 30, annual: 365 };
    const days = pricing[billing];
    
    if (!days) {
      console.error("Invalid billing period:", billing);
      return res.status(400).json({ error: "Invalid billing period" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // Update subscription in Firestore
    await db
      .collection("users")
      .doc(userId)
      .collection("subscription")
      .doc("current")
      .set({
        active: true,
        plan: "premium",
        billing: billing,
        expiresAt: expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paystackReference: event.data.reference,
      });

    console.log(`Subscription activated for user ${userId}: ${billing}`);
  }

  res.status(200).json({ received: true });
});

// Send subscription expiry reminders
exports.sendExpiryReminders = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find subscriptions expiring tomorrow
    const expiringSubs = await db
      .collectionGroup("subscription")
      .where("active", "==", true)
      .where("expiresAt", ">=", now)
      .where("expiresAt", "<=", tomorrow)
      .get();

    console.log(`Found ${expiringSubs.size} subscriptions expiring tomorrow`);

    // Send reminder notifications (can be extended with FCM)
    for (const doc of expiringSubs.docs) {
      const subData = doc.data();
      const userId = doc.ref.parent.parent.id;
      
      console.log(`Reminder: User ${userId} subscription expires tomorrow`);
      
      // Add notification to user's notifications subcollection
      await db
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .add({
          type: "subscription_expiry",
          title: "Subscription Expiring Soon",
          body: "Your subscription expires tomorrow. Renew now to keep using Premium features.",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
    }

    return null;
  });

// Clean up expired subscriptions
exports.cleanupExpiredSubscriptions = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
    const now = new Date();

    const expiredSubs = await db
      .collectionGroup("subscription")
      .where("active", "==", true)
      .where("expiresAt", "<", now)
      .get();

    console.log(`Found ${expiredSubs.size} expired subscriptions`);

    const batch = db.batch();
    
    expiredSubs.docs.forEach((doc) => {
      batch.update(doc.ref, {
        active: false,
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log("Expired subscriptions cleaned up");

    return null;
  });
