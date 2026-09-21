import { shellData } from "@/lib/services/project-service";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell projects={await shellData()}>{children}</AppShell>;
}
