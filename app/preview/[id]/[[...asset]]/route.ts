import { NextResponse } from "next/server"
import { getTaskById } from "@/lib/services/taskService"
import type { CodingTaskOutput } from "@/types/tasks"

function getContentType(fileName: string) {
    if (fileName.endsWith(".css")) return "text/css; charset=utf-8"
    if (fileName.endsWith(".js")) return "application/javascript; charset=utf-8"
    return "text/html; charset=utf-8"
}

function isCodingProjectOutput(output: unknown): output is Extract<CodingTaskOutput, { kind: "project" }> {
    return Boolean(
        output &&
        typeof output === "object" &&
        "kind" in output &&
        (output as { kind?: string }).kind === "project" &&
        "files" in output
    )
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; asset?: string[] }> }
) {
    try {
        const { id, asset } = await params

        if (!id || id.includes("..")) {
            return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
        }

        const task = await getTaskById(id)
        if (task.agent_type !== "coding" || task.status !== "completed" || !isCodingProjectOutput(task.output_result)) {
            return NextResponse.json({ error: "Preview not available for this task" }, { status: 404 })
        }

        const assetPath = asset?.length ? asset.join("/") : task.output_result.previewEntry
        const fileContent = task.output_result.files[assetPath as keyof typeof task.output_result.files]

        if (!fileContent) {
            return NextResponse.json({ error: "Preview asset not found" }, { status: 404 })
        }

        return new Response(fileContent, {
            headers: {
                "Content-Type": getContentType(assetPath),
                "Cache-Control": "no-store",
                "X-Frame-Options": "SAMEORIGIN",
            },
        })
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Preview failed" }, { status: 500 })
    }
}
