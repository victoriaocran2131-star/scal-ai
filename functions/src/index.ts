import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

const ADMIN_EMAIL = functions.config().admin?.email || "";

function isAdminEmail(email: string): boolean {
  if (!ADMIN_EMAIL || !email) return false;
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

  let totalScans = 0;
  const recentUsers: Array<{ email: string; date: string }> = [];

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.scanCount) totalScans += data.scanCount;

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
    totalScans,
    recentUsers: recentUsers.slice(0, 5),
  };
});