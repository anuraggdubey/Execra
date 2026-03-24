import { NextResponse } from "next/server"
import { projectExists, zipProject } from "@/lib/tools/fileTool"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params

        if (!id || id.includes("..")) {
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
        }

        if (!(await projectExists(id))) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        const zipBuffer = await zipProject(id)

        return new Response(new Uint8Array(zipBuffer), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${id}.zip"`,
                "Content-Length": String(zipBuffer.length),
            },
        })
    } catch (error: unknown) {
        console.error("[download] Error:", error)
        return NextResponse.json({ error: error instanceof Error ? error.message : "Download failed" }, { status: 500 })
    }
}
