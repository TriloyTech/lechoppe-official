export function appendCreated<T>(current: T[], created: T | null | undefined) {
  return created ? [...current, created] : current;
}

export function removeById<T extends { id: string }>(current: T[], id: string) {
  return current.filter((entity) => entity.id !== id);
}

export function removeGroupChoices<T extends { group_id: string }>(current: T[], groupId: string) {
  return current.filter((choice) => choice.group_id !== groupId);
}
