import { NextResponse } from "next/server"
import { askRepositoryQuestion } from "@/lib/agents/githubAgentService"

export async function POST(req: Request) {
    try {
        const { owner, repo, question, context } = await req.json()
        if (!question || !context) return NextResponse.json({ error: "Question and context required" }, { status: 400 })

        return NextResponse.json({
            success: true,
            answer: await askRepositoryQuestion({ owner, repo, question, context }),
        })
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Q&A failed" }, { status: 500 })
    }
}
