import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { deleteTodo, flipTodo, insertTodo, listTodos } from "lib/todos";

// The todo list on a real libSQL database: a local file through the libsql
// client's file mode (no libSQL server here; the Worker reaches each user's
// Turso database over HTTP with the same driver). The schema is what a user's
// database is seeded with: migrations/ (drizzle-kit's), or dump.sql (the
// template's "Create a Database" seed).
const WEB = path.resolve(__dirname, "../../../apps/web");
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

async function database(seed: "migrations" | "dump") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "todos-"));
  dirs.push(dir);
  const client = createClient({ url: `file:${path.join(dir, "user.db")}` });
  if (seed === "migrations") {
    const journal = JSON.parse(fs.readFileSync(path.join(WEB, "migrations/meta/_journal.json"), "utf8"));
    for (const entry of journal.entries) {
      const sql = fs.readFileSync(path.join(WEB, "migrations", `${entry.tag}.sql`), "utf8");
      for (const statement of sql.split("--> statement-breakpoint")) {
        if (statement.trim()) await client.execute(statement);
      }
    }
  } else {
    await client.executeMultiple(fs.readFileSync(path.join(WEB, "dump.sql"), "utf8"));
  }
  return drizzle(client, { schema });
}

describe.each(["migrations", "dump"] as const)("the todo list (lib/todos.ts), seeded from %s", (seed) => {
  it("adds, lists, toggles and removes a user's todos", async () => {
    const db = await database(seed);
    expect(await listTodos(db)).toEqual([]);

    await insertTodo(db, "Ship it — O'Brien & Co");
    await insertTodo(db, "Water the plants");
    let todos = await listTodos(db);
    expect(todos.map((t) => [t.description, t.completed])).toEqual([
      ["Ship it — O'Brien & Co", false],
      ["Water the plants", false],
    ]);

    await flipTodo(db, todos[0].id);
    todos = await listTodos(db);
    expect(todos[0].completed).toBe(true);
    await flipTodo(db, todos[0].id);
    expect((await listTodos(db))[0].completed).toBe(false);

    await deleteTodo(db, todos[1].id);
    expect((await listTodos(db)).map((t) => t.description)).toEqual(["Ship it — O'Brien & Co"]);
  });

  it("keeps one user's todos in that user's database only", async () => {
    const ada = await database(seed);
    const grace = await database(seed);
    await insertTodo(ada, "Ada's todo");
    expect(await listTodos(grace)).toEqual([]);
    expect((await listTodos(ada)).map((t) => t.description)).toEqual(["Ada's todo"]);
  });
});
