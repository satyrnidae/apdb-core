module.exports = {
  scripts: {
    default: "nps run.default",
    debug: "nps build & nps run.debug",
    build: {
      default: "nps clean & tsc --sourceMap",
      production: "nps clean & tsc"
    },
    run: {
      default: "node bin/app.js",
      debug: "node --inspect-brk bin/app.js"
    },
    clean: "if exist .\\bin (rmdir /s /q .\\bin)"
  }
}