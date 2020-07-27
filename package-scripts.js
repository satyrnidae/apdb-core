module.exports = {
  scripts: {
    default: "nps run.default",
    debug: "nps build & nps run.debug",
    build: {
      default: "tsc --sourceMap",
      production: "tsc"
    },
    run: {
      default: "node bin/app.js",
      debug: "node --inspect-brk bin/app.js"
    }
  }
}