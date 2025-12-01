import type { GreetingContext } from "./greetingManager";
import { GreetingCard } from "./cardTypes";

export interface ProjectSummary {
  id: string;
  name: string;
  nextStep?: string | null;
  priority?: number | null;
}

export interface ProjectCardsDeps {
  loadActiveProjects: (userId: string) => Promise<ProjectSummary[]>;
}

export function createDefaultFetchProjectCards(deps: ProjectCardsDeps) {
  return async function fetchProjectCards(
    context: GreetingContext
  ): Promise<GreetingCard[]> {
    const projects = await deps.loadActiveProjects(context.userId);
    return projects.map((project, index) => {
      const basePriority = project.priority ?? 0.8;
      const priority = basePriority - index * 0.05;
      return {
        id: "project:" + project.id,
        type: "project",
        title: project.name,
        subtitle: null,
        body: project.nextStep ?? null,
        topicTags: ["project"],
        priority: priority,
        source: null,
        imageUrl: null,
        imagePrompt: null,
        actions: [
          {
            label: "Im Chat weiterarbeiten",
            actionType: "open_chat",
            payload: {
              projectId: project.id
            }
          }
        ]
      };
    });
  };
}
