import express from "express"
import next from "next"
import path from "path"
import fs from "fs"

const dev = process.env.NODE_ENV !== "production"
const port = Number(process.env.PORT || 3001)
const app = next({ dev, hostname: "0.0.0.0", port })
const handle = app.getRequestHandler()

function resolveProjectPath(projectId) {
    if (!projectId || projectId.includes("..") || projectId.includes("\\")) {
        return null
    }

    return path.join(process.cwd(), "projects", projectId)
}

app.prepare().then(() => {
    const server = express()

    server.get(/^\/preview\/([^/]+)\/?(.*)$/, (req, res) => {
        const [, projectId = "", assetPath = ""] = req.path.match(/^\/preview\/([^/]+)\/?(.*)$/) ?? []
        const projectDir = resolveProjectPath(projectId)

        if (!projectDir) {
            res.status(400).send("Invalid project id")
            return
        }

        const safeAssetPath = assetPath || "index.html"
        const filePath = path.join(projectDir, safeAssetPath)

        if (!filePath.startsWith(projectDir) || !fs.existsSync(filePath)) {
            res.status(404).send("Preview asset not found")
            return
        }

        res.setHeader("X-Frame-Options", "SAMEORIGIN")
        res.setHeader("Cache-Control", "no-store")
        res.sendFile(filePath)
    })

    server.all(/.*/, (req, res) => handle(req, res))

    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`)
    })
})
