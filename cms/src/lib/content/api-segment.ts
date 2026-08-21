/** Dashboard fetch path segment for a content type (`/api/{segment}/:id`). */
export function contentTypeApiSegment(type: string): string {
  switch (type) {
    case "news":
      return "news";
    case "event":
      return "events";
    case "publication":
      return "publications";
    case "partner":
      return "partners";
    case "alert":
      return "alerts";
    case "research_group":
      return "research-groups";
    case "research_project":
      return "research-projects";
    case "law":
      return "laws";
    case "platform":
      return "platforms";
    default:
      return type;
  }
}
