import { spawn } from "node:child_process"
import { createServer as createNetServer } from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
try {
  process.loadEnvFile(path.join(root, ".env"))
} catch (error) {
  if (error.code !== "ENOENT") throw error
}

const node = process.execPath
const requestedApiPort = Number(process.env.API_PORT || "4174")
const requestedWebPort = Number(process.env.PORT || "8443")
const apiSearchLimit = Math.min(65535, requestedApiPort + 100)
const webSearchLimit = Math.min(65535, requestedWebPort + 100)
let api
let web
let stopping = false
let apiReady = false

if (
  !Number.isInteger(requestedApiPort) ||
  requestedApiPort < 1 ||
  requestedApiPort > 65535
) {
  throw new Error("API_PORT must be a number between 1 and 65535.")
}
if (
  !Number.isInteger(requestedWebPort) ||
  requestedWebPort < 1 ||
  requestedWebPort > 65535
) {
  throw new Error("PORT must be a number between 1 and 65535.")
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function isMotoFixApi(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(800),
    })
    if (!response.ok) return false
    const result = await response.json()
    return result.ok === true && result.service === "MotoFix API"
  } catch {
    return false
  }
}

async function isMotoFixWeb(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(800),
    })
    if (!response.ok) return false
    const html = await response.text()
    if (!html.includes("MotoFix") || !html.includes("/src/main.tsx"))
      return false

    const viteClient = await fetch(`http://127.0.0.1:${port}/@vite/client`, {
      signal: AbortSignal.timeout(800),
    })
    return viteClient.ok
  } catch {
    return false
  }
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const probe = createNetServer()
    probe.once("error", () => resolve(false))
    probe.listen(port, "0.0.0.0", () => {
      probe.close(() => resolve(true))
    })
  })
}

async function findApi() {
  if (await isMotoFixApi(requestedApiPort)) {
    return { port: requestedApiPort, reused: true }
  }

  if (await isPortAvailable(requestedApiPort)) {
    return { port: requestedApiPort, reused: false }
  }

  for (let port = requestedApiPort + 1; port <= apiSearchLimit; port += 1) {
    if (await isMotoFixApi(port)) return { port, reused: true }
    if (await isPortAvailable(port)) return { port, reused: false }
  }

  throw new Error(
    `No available MotoFix API port was found between ${requestedApiPort} and ${apiSearchLimit}. Set API_PORT in .env to an unused port and retry.`,
  )
}

async function findWeb() {
  if (await isMotoFixWeb(requestedWebPort)) {
    return { port: requestedWebPort, reused: true }
  }

  if (await isPortAvailable(requestedWebPort)) {
    return { port: requestedWebPort, reused: false }
  }

  for (let port = requestedWebPort + 1; port <= webSearchLimit; port += 1) {
    if (await isMotoFixWeb(port)) return { port, reused: true }
    if (await isPortAvailable(port)) return { port, reused: false }
  }

  throw new Error(
    `No available MotoFix web port was found between ${requestedWebPort} and ${webSearchLimit}. Set PORT in .env to an unused port and retry.`,
  )
}

function stop(code = 0) {
  if (stopping) return
  stopping = true
  if (api && api.exitCode === null) api.kill()
  if (web && web.exitCode === null) web.kill()
  process.exitCode = code
}

function installSignalHandlers() {
  process.once("SIGINT", () => stop(0))
  process.once("SIGTERM", () => stop(0))
}

function attachApiHandlers(child) {
  child.on("error", (error) => {
    console.error("MotoFix API failed to start:", error.message)
    stop(1)
  })
  child.on("exit", (code) => {
    if (!stopping) {
      if (apiReady) console.error("MotoFix API stopped unexpectedly.")
      stop(code || 1)
    }
  })
}

function startWeb(environment, port) {
  web = spawn(
    node,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      process.env.FIGMA_DEV_SERVER_HOST || "0.0.0.0",
      "--port",
      String(port),
    ],
    { cwd: root, env: environment, stdio: "inherit" },
  )
  web.on("error", (error) => {
    console.error("MotoFix web app failed to start:", error.message)
    stop(1)
  })
  web.on("exit", (code) => {
    if (!stopping) stop(code || 0)
  })
}

async function main() {
  const selectedApi = await findApi()
  const selectedWeb = await findWeb()
  if (selectedApi.reused && selectedWeb.reused) {
    console.log(
      `MotoFix is already running at http://localhost:${selectedWeb.port}/.`,
    )
    return
  }
  installSignalHandlers()

  const apiPort = String(selectedApi.port)
  const environment = {
    ...process.env,
    API_PORT: apiPort,
    API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
    PORT: String(selectedWeb.port),
    APP_ORIGIN:
      process.env.APP_ORIGIN || `http://localhost:${selectedWeb.port}`,
  }

  if (selectedApi.reused) {
    console.log(`Using the existing MotoFix API on port ${apiPort}.`)
  } else {
    if (selectedApi.port !== requestedApiPort) {
      console.log(
        `Port ${requestedApiPort} is occupied; starting the MotoFix API on port ${apiPort}.`,
      )
    }

    api = spawn(node, ["server/index.mjs"], {
      cwd: root,
      env: environment,
      stdio: "inherit",
    })
    attachApiHandlers(api)

    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (stopping || api.exitCode !== null || api.signalCode !== null) return
      if (await isMotoFixApi(selectedApi.port)) break
      await wait(250)
    }

    if (!(await isMotoFixApi(selectedApi.port))) {
      console.error(
        `MotoFix API did not become ready on port ${apiPort}. Check its startup message above.`,
      )
      stop(1)
      return
    }
    apiReady = true
  }

  if (selectedWeb.reused) {
    console.log(
      `Using the existing MotoFix web app at http://localhost:${selectedWeb.port}/.`,
    )
  } else {
    if (selectedWeb.port !== requestedWebPort) {
      console.log(
        `Port ${requestedWebPort} is occupied; starting the MotoFix web app at http://localhost:${selectedWeb.port}/.`,
      )
    }
    startWeb(environment, selectedWeb.port)
  }
}

main().catch((error) => {
  console.error("MotoFix could not start:", error.message)
  stop(1)
})
