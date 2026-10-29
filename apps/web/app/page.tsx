import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { clerkConnected } from "@/lib/clerk";
import { TursoLogo } from "./_components/turso-logo";
import { SITE_NAME, SOURCE_URL } from "./site";

export default async function Page() {
  if (clerkConnected) {
    const { userId } = await auth();
    if (userId) return redirect("/dashboard");
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6">
      <TursoLogo className="h-28 text-aquamarine" />
      <h1 className="text-5xl font-black text-center tracking-tight text-white">{SITE_NAME}</h1>
      <p className="text-lg text-white/60">
        Database per user demo &mdash;{" "}
        <Link href="/sign-up" className="underline text-[#4FF8D2]">
          Sign up
        </Link>{" "}
        or{" "}
        <Link href="/sign-in" className="underline text-[#4FF8D2]">
          login
        </Link>{" "}
      </p>
      <div className="flex border border-white/5 rounded divide-x divide-white/5">
        <a
          href="https://turso.tech"
          className="text-white hover:text-aquamarine hover:bg-white/5 px-6 py-2.5"
          target="_blank"
        >
          What is Turso?
        </a>
        <a
          href={SOURCE_URL}
          className="text-white hover:text-aquamarine hover:bg-white/5 px-6 py-2.5"
          target="_blank"
        >
          GitHub Repo
        </a>
      </div>
    </div>
  );
}
