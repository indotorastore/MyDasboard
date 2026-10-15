import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { getUserSession } from "@/lib/auth/session";
import { AdminDashboard, type AdminUser } from "@/components/admin/admin-dashboard";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { resolveTradingAccessStatus } from "@/lib/auth/session";

export const instant = false;

export default function Home() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f6f7fb] text-sm text-slate-500">Memuat workspace...</main>}>
      <AuthenticatedWorkspace />
    </Suspense>
  );
}

async function AuthenticatedWorkspace() {
  const user = await getUserSession();
  if (!user) redirect("/login");
  if (user.role === "admin") {
    const db = getFirebaseAdminFirestore();
    const [userSnapshot, totalUsers, adminUsers] = await Promise.all([
      db.collection("users").orderBy("createdAt", "desc").limit(100).get(),
      db.collection("users").count().get(),
      db.collection("users").where("role", "==", "admin").count().get(),
    ]);
    const users: AdminUser[] = userSnapshot.docs.map((document) => {
      const data = document.data();
      const access = data.tradingAccess;
      const expiration = access?.expiresAt instanceof Timestamp ? access.expiresAt.toDate() : null;
      const storedStatus = access?.status;
      const role = data.role === "admin" ? "admin" : "user";
      const tradingStatus = resolveTradingAccessStatus(role, storedStatus, expiration);
      return {
        uid: document.id,
        email: typeof data.email === "string" ? data.email : "",
        displayName: typeof data.displayName === "string" ? data.displayName : "",
        username: typeof data.username === "string" ? data.username : "",
        role,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null,
        tradingStatus,
        tradingExpiresAt: expiration?.toISOString() ?? null,
      };
    });

    return (
      <AdminDashboard
        user={user}
        users={users}
        totalUsers={totalUsers.data().count}
        totalAdmins={adminUsers.data().count}
      />
    );
  }
  return <Workspace user={user} />;
}
