import { myWork } from "@/lib/services/issue-service";
import { IssueList } from "@/components/issue-views";

export default async function MyIssues() {
  const issues = await myWork("HUMAN", { includeDone: true });
  return (
    <div>
      <h1 className="border-b px-4 py-3 text-lg font-semibold tracking-tight">My Issues</h1>
      <IssueList issues={issues} />
    </div>
  );
}
