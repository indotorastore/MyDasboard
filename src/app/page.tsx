import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { getUserSession } from "@/lib/auth/session";

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
  return <Workspace user={user} />;
}
