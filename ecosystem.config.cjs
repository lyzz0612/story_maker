/** @type {import("pm2").StartOptions[]} */
const apps = [
  {
    name: "story-maker-server",
    cwd: "./apps/server",
    script: "dist/index.js",
    env: {
      NODE_ENV: "production"
    }
  }
];

module.exports = { apps };
