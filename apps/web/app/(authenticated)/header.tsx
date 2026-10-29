import { TursoLogo } from "@/app/_components/turso-logo";
import { UserButton } from "./user-button";

export function Header() {
  return (
    <header className="border-b border-white/5">
      <div className="max-w-2xl mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-x-3">
            <div className="flex items-center gap-3 text-aquamarine">
              <TursoLogo className="h-6" />
            </div>
          </div>

          <UserButton />
        </div>
      </div>
    </header>
  );
}
