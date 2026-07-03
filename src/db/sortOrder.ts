import { runInTransaction } from "./client";

export function updateSortOrder(
  tableName: "habits" | "treatments",
  orderedIds: string[],
): Promise<void> {
  return runInTransaction(async (db) => {
    if (!db) return;
    for (let i = 0; i < orderedIds.length; i++) {
      await db.run(
        `UPDATE ${tableName} SET sort_index = ? WHERE id = ?`,
        [i, orderedIds[i]],
        false,
      );
    }
  });
}
