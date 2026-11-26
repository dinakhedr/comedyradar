/** Admin Comedians and Groups are two pages (Profiles was split in two). */
export const adminListPath = (kind: string) => (kind === "group" ? "/admin/groups" : "/admin/comedians");
export const adminEditPath = (kind: string, id: string) => `${adminListPath(kind)}/${id}/edit`;
