"use server";

import { revalidatePath } from "next/cache";

import { getDatabaseClient } from "@/lib/db";
import { deleteTodo, flipTodo, insertTodo } from "@/lib/todos";

export type TodoItem = {
  id: number;
  description: string;
};

export const addTodo = async (formData: FormData) => {
  const client = await getDatabaseClient();

  const description = formData.get("description") as string;

  if (!client) return null;

  await insertTodo(client, description);

  revalidatePath("/dashboard");
};

export const removeTodo = async (id: number) => {
  const client = await getDatabaseClient();

  if (!client) return null;

  await deleteTodo(client, id);

  revalidatePath("/dashboard");
};

export const toggleTodo = async (id: number) => {
  const client = await getDatabaseClient();

  if (!client) return null;

  await flipTodo(client, id);

  revalidatePath("/dashboard");
};
