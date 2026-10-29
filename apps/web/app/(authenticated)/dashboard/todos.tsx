import { getDatabaseClient } from "@/lib/db";
import { listTodos } from "@/lib/todos";
import { TodoList } from "./todo-list";

export async function Todos() {
  const client = await getDatabaseClient();

  if (!client) {
    return <p>Database not ready</p>;
  }

  const todos = await listTodos(client);

  return <TodoList initialTodos={todos || []} />;
}
