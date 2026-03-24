import { NextResponse } from "next/server"
import { analyzeDocument } from "@/lib/agents/documentAgentService"
import { AgentExecutionError } from "@/lib/agents/shared"

export const maxDuration = 60

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get("file")
        const question = formData.get("question")

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "A document file is required." }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await analyzeDocument({
            fileName: file.name,
            mimeType: file.type,
            buffer,
            question: typeof question === "string" ? question : undefined,
        })

        return NextResponse.json({
            success: true,
            ...result,
        })
    } catch (error: unknown) {
        console.error("[analyze-document] Error:", error)

        if (error instanceof AgentExecutionError) {
            return NextResponse.json(
                { error: error.message, code: error.code, details: error.details },
                { status: error.status }
            )
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Document analysis failed" },
            { status: 500 }
        )
    }
}
