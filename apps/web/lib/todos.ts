// The todo list's queries, against one user's database. The server actions
// and the dashboard run them on the signed-in user's Turso database
// (lib/db.ts); the tests run them on a local libSQL file with migrations/
// applied.
import { eq, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "@/db/schema";

export type TodoDatabase = LibSQLDatabase<typeof schema>;

export function listTodos(db: TodoDatabase) {
  return db.query.todos.findMany();
}

export async function insertTodo(db: TodoDatabase, description: string) {
  await db.insert(schema.todos).values({ description });
}

export async function deleteTodo(db: TodoDatabase, id: number) {
  await db.delete(schema.todos).where(eq(schema.todos.id, id));
}

export async function flipTodo(db: TodoDatabase, id: number) {
  await db
    .update(schema.todos)
    .set({ completed: sql`NOT completed` })
    .where(eq(schema.todos.id, id));
}
