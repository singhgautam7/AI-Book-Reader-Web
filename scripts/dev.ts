import { $ } from "bun";

await Promise.all([
  $`cd server && bun run dev`,
  $`cd client && bun run dev`,
]);
