import { getActivity, getIssue } from "@/lib/services/issue-service";
import { listComments } from "@/lib/services/comment-service";
import { orNotFound } from "@/lib/page-utils";
import { IssueDetail } from "@/components/issue-detail";

export default async function IssuePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const issue = await orNotFound(getIssue(key));
  const [comments, activity] = await Promise.all([listComments(key), getActivity(key)]);
  return <IssueDetail issue={issue} comments={comments} activity={activity} />;
}
