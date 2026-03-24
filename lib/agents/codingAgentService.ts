import { completeWithOpenRouter } from "@/lib/llm/openrouter"
import { AgentExecutionError, createLlmError } from "@/lib/agents/shared"
import { fileTool } from "@/lib/tools/fileTool"
import { previewTool } from "@/lib/tools/previewTool"

export interface ProjectFiles {
    html: string
    css: string
    js: string
}

const CODING_AGENT_SYSTEM_PROMPT = `You are a senior product engineer and visual frontend designer who only returns project code.

Your job is to generate polished, advanced UI by default, not wireframes or classroom-demo layouts.

Quality bar:
- Build interfaces that feel premium, modern, and intentionally designed.
- Avoid barebones outputs, oversized empty areas, default browser styling, and "toy app" layouts.
- Use strong hierarchy, spacing, contrast, and composition.
- Include enough content density that the preview looks complete on first load.
- Prefer rich dashboards, real-looking panels, meaningful navigation, charts, tables, filters, and status areas when the prompt asks for admin, analytics, SaaS, workspace, or dashboard UI.
- Use tasteful gradients, layered surfaces, hover states, transitions, and responsive layouts.
- Make the result look like a product someone would actually ship.

Implementation requirements:
1. Return exactly three files using markdown fences named index.html, style.css, and script.js.
2. Generate complete, working code only.
3. Do not describe how to save files or preview files.
4. index.html must reference style.css and script.js with relative paths.
5. Keep the project self-contained with no build step.
6. CSS must be substantial and custom, with design tokens in :root, responsive breakpoints, and clear component styling.
7. JavaScript must add meaningful interactivity where appropriate, such as tabs, filtering, chart toggles, menus, selectable cards, expandable panels, or mock data rendering.
8. Never leave TODOs, placeholders, or comments saying something should be added later.
9. Never produce a plain document with a few boxes and labels. The first render should already look impressive.

Dashboard-specific expectations:
- Include a sidebar or top navigation, summary KPI cards, at least one rich chart area, a secondary data view such as table/activity/feed, and supporting controls.
- Use realistic sample labels and values so the preview feels believable.
- Organize dashboard content in dense grids instead of long single-column stacking.

Code requirements:
- Use semantic HTML.
- Use accessible labels and button text.
- Keep JavaScript framework-free and browser-ready.
- Ensure the layout works on desktop and mobile.
- Prefer refined typography, card systems, and polished states over novelty gimmicks.`

export function parseAgentOutput(text: string): ProjectFiles {
    const htmlMatch = text.match(/```(?:index\.html|html)\s*([\s\S]*?)```/i)
    const cssMatch = text.match(/```(?:style\.css|css)\s*([\s\S]*?)```/i)
    const jsMatch = text.match(/```(?:script\.js|javascript|js)\s*([\s\S]*?)```/i)

    const html = htmlMatch?.[1]?.trim()
    const css = cssMatch?.[1]?.trim()
    const js = jsMatch?.[1]?.trim()

    if (!html || css === undefined || js === undefined) {
        throw new AgentExecutionError(
            "INVALID_LLM_OUTPUT",
            "Coding agent did not return the required file structure",
            502
        )
    }

    return { html, css, js }
}

const LANGUAGE_LABELS: Record<string, string> = {
    "html-css-js": "HTML / CSS / JS",
    python: "Python",
    javascript: "JavaScript",
    typescript: "TypeScript",
    react: "React (JSX/TSX)",
    java: "Java",
    cpp: "C++",
    go: "Go",
    rust: "Rust",
    swift: "Swift",
    ruby: "Ruby",
    php: "PHP",
}

const SINGLE_FILE_SYSTEM_PROMPT = (lang: string) => `You are a senior software engineer.

Your job is to generate clean, idiomatic, production-quality ${lang} code.

Rules:
1. Return a SINGLE fenced code block with the complete source file.
2. The code must be complete, runnable, and well-structured.
3. Include proper imports/includes at the top.
4. Add clear inline comments for complex logic.
5. Use modern language features and best practices.
6. Never leave TODOs, placeholders, or incomplete sections.
7. If the request involves a CLI tool, include argument parsing.
8. If the request involves a web server, include routing and response handling.
9. Make the code substantial and impressive, not a minimal stub.
10. Output ONLY the code block, no explanations before or after.`

export function parseSingleFileOutput(text: string, language: string): { code: string; filename: string } {
    const match = text.match(/```(?:\w+)?\s*([\s\S]*?)```/)
    const code = match?.[1]?.trim()

    if (!code) {
        throw new AgentExecutionError("INVALID_LLM_OUTPUT", "Coding agent did not return a code block", 502)
    }

    const extensions: Record<string, string> = {
        python: "main.py",
        javascript: "index.js",
        typescript: "index.ts",
        react: "App.tsx",
        java: "Main.java",
        cpp: "main.cpp",
        go: "main.go",
        rust: "main.rs",
        swift: "main.swift",
        ruby: "main.rb",
        php: "index.php",
    }

    return { code, filename: extensions[language] ?? "main.txt" }
}

export async function runCodingAgent(prompt: string, language?: string) {
    const lang = language && language !== "html-css-js" ? language : null

    if (!lang) {
        // Original HTML/CSS/JS flow
        let raw: string
        try {
            raw = await completeWithOpenRouter({
                system: CODING_AGENT_SYSTEM_PROMPT,
                user: `Build this project.\n\nUser request:\n${prompt}\n\nDefault quality expectations:\n- Make it visually advanced and product-grade.\n- Add rich structure, not a minimal mockup.\n- If the request is for a dashboard, admin panel, analytics page, workspace, or SaaS UI, make it dense, polished, and interactive by default.\n- Return only the three required files.`,
                maxTokens: 8000,
                temperature: 0.7,
            })
        } catch (error) {
            throw createLlmError(error, "Coding generation failed")
        }

        const files = parseAgentOutput(raw)
        const projectId = `project-${Date.now()}`

        await fileTool(projectId, [
            { name: "index.html", content: files.html },
            { name: "style.css", content: files.css },
            { name: "script.js", content: files.js },
        ])

        return {
            projectId,
            files,
            raw,
            preview: previewTool(projectId),
            language: "html-css-js",
        }
    }

    // Single-file language flow
    const langLabel = LANGUAGE_LABELS[lang] ?? lang
    let raw: string
    try {
        raw = await completeWithOpenRouter({
            system: SINGLE_FILE_SYSTEM_PROMPT(langLabel),
            user: `Write ${langLabel} code for this task:\n\n${prompt}`,
            maxTokens: 8000,
            temperature: 0.7,
        })
    } catch (error) {
        throw createLlmError(error, "Coding generation failed")
    }

    const { code, filename } = parseSingleFileOutput(raw, lang)
    const projectId = `project-${Date.now()}`

    await fileTool(projectId, [{ name: filename, content: code }])

    return {
        projectId,
        files: null,
        singleFile: { code, filename, language: lang },
        raw,
        preview: null,
        language: lang,
    }
}
