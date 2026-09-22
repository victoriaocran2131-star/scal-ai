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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStats = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const ADMIN_EMAIL = ((_a = functions.config().admin) === null || _a === void 0 ? void 0 : _a.email) || "";
function isAdminEmail(email) {
    if (!ADMIN_EMAIL || !email)
        return false;
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
    let totalScans = 0;
    const recentUsers = [];
    for (const doc of usersSnap.docs) {
        const data = doc.data();
        if (data.scanCount)
            totalScans += data.scanCount;
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
        totalScans,
        recentUsers: recentUsers.slice(0, 5),
    };
});
//# sourceMappingURL=index.js.map