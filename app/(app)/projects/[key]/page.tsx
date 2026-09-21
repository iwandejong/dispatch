import { resolveProject } from "@/lib/services/project-service";
import { searchIssues } from "@/lib/services/search-service";
import { orNotFound } from "@/lib/page-utils";
import { ProjectView } from "@/components/project-view";

export default async function ProjectPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = await orNotFound(resolveProject(key));
  const issues = await searchIssues({ project: project.identifier, limit: 200 });
  return <ProjectView project={project} issues={issues} />;
}
