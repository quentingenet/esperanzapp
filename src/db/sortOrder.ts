import { runInTransaction } from "./client";

export function updateSortOrder(
  tableName: "habits" | "treatments",
  orderedIds: string[],
): Promise<void> {
  return runInTransaction(async (db) => {
    if (!db || orderedIds.length === 0) return;
    const cases = orderedIds.map(() => "WHEN id = ? THEN ?").join(" ");
    const placeholders = orderedIds.map(() => "?").join(", ");
    const params: (string | number)[] = [
      ...orderedIds.flatMap((id, i) => [id, i]),
      ...orderedIds,
    ];
    await db.run(
      `UPDATE ${tableName} SET sort_index = CASE ${cases} END WHERE id IN (${placeholders})`,
      params,
      false,
    );
  });
}
