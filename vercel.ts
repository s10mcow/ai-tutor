import { withEve } from "eve/vercel";
export default await withEve({
  services: {
    web: {
      framework: "nextjs",
      root: "apps/web",
      buildCommand: "node ../../node_modules/next/dist/bin/next build",
      devCommand:
        "node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port $PORT",
    },
  },
  routes: [{ src: "^(.*)$", destination: { type: "service", service: "web" } }],
});
