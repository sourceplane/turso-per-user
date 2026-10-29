import { defineConfig } from "vitest/config";
import * as fs from "node:fs";
import * as path from "node:path";

const web = path.resolve(__dirname, "../../apps/web");
// The app's own copies of the packages its modules import: pnpm may give this
// package a differently-peered drizzle-orm, and the schema's tables and the
// driver must come from one copy.
const own = (pkg: string) => fs.realpathSync(path.join(web, "node_modules", pkg));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: web + "/" },
      { find: /^app\//, replacement: web + "/app/" },
      { find: /^lib\//, replacement: web + "/lib/" },
      { find: /^drizzle-orm(\/.*)?$/, replacement: own("drizzle-orm") + "$1" },
      { find: /^@libsql\/client(\/.*)?$/, replacement: own("@libsql/client") + "$1" },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
