"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import {
    AlertCircle,
    Box,
    Braces,
    CheckCircle2,
    Download,
    ExternalLink,
    FileCode2,
    FileText,
    Github,
    Layers3,
    Loader2,
    Sparkles,
    Upload,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { useAgentContext } from "@/lib/AgentContext"
import ConnectWalletButton from "@/components/wallet/ConnectWalletButton"
import { useWalletContext } from "@/lib/WalletContext"

const GitHubAgent = dynamic(() => import("@/components/agents/GitHubAgent"), {
    ssr: false,
    loading: () => (
        <div className="panel p-6">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton mt-4 h-24" />
            <div className="skeleton mt-4 h-64" />
        </div>
    ),
})

type WorkspaceAgentId = "github" | "coding" | "document"
type RunState = "idle" | "running" | "done" | "error"

type AgentDefinition = {
    id: WorkspaceAgentId
    label: string
    icon: React.ElementType
    description: string
    badge: string
}

type GeneratedFiles = { html: string; css: string; js: string }

type CodingResult =
    | {
        mode: "project"
        projectId: string
        files: GeneratedFiles
        previewUrl: string
      }
    | {
        mode: "single-file"
        projectId: string
        fileName: string
        language: string
        code: string
      }

type DocumentResult = {
    fileName: string
    fileType: string
    analysis: string
    truncated: boolean
}

const AGENTS: AgentDefinition[] = [
    {
        id: "github",
        label: "GitHub Agent",
        icon: Github,
        description: "Connect a repository, index source context, and review code through a focused repo workflow.",
        badge: "Repository intelligence",
    },
    {
        id: "coding",
        label: "Coding Agent",
        icon: Braces,
        description: "Generate MVP-ready code artifacts and previews for product surfaces that feed the next integration phase.",
        badge: "Build surfaces",
    },
    {
        id: "document",
        label: "Document Agent",
        icon: FileText,
        description: "Parse project docs, specs, and datasets into concise analysis the team can use immediately.",
        badge: "Spec digestion",
    },
]

function getErrorMessage(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback
    if (message.includes("429 Provider returned error")) {
        return "The model provider is rate-limiting requests right now. Retry in a moment or switch to a paid-capable model."
    }
    return message
}

export default function AgentsPage() {
    const { startAgentRun, completeAgentRun, failAgentRun } = useAgentContext()
    const { walletAddress, shortWalletAddress, walletBalance } = useWalletContext()
    const [selectedAgentId, setSelectedAgentId] = useState<WorkspaceAgentId>("github")

    const [codingPrompt, setCodingPrompt] = useState("")
    const [codingLanguage, setCodingLanguage] = useState("html-css-js")
    const [codingResult, setCodingResult] = useState<CodingResult | null>(null)
    const [codingState, setCodingState] = useState<RunState>("idle")
    const [codingError, setCodingError] = useState<string | null>(null)

    const [documentFile, setDocumentFile] = useState<File | null>(null)
    const [documentQuestion, setDocumentQuestion] = useState("")
    const [documentResult, setDocumentResult] = useState<DocumentResult | null>(null)
    const [documentState, setDocumentState] = useState<RunState>("idle")
    const [documentError, setDocumentError] = useState<string | null>(null)

    const selectedAgent = useMemo(
        () => AGENTS.find((agent) => agent.id === selectedAgentId) ?? AGENTS[0],
        [selectedAgentId]
    )

    const runCodingAgent = async () => {
        if (!walletAddress || !codingPrompt.trim() || codingState === "running") return

        setCodingState("running")
        setCodingError(null)
        setCodingResult(null)
        startAgentRun("coding", `Generating build output for: ${codingPrompt}`)

        try {
            const response = await fetch("/api/run-coding-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: codingPrompt, language: codingLanguage }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Coding agent failed")

            if (data.files && data.preview?.previewUrl) {
                setCodingResult({
                    mode: "project",
                    projectId: data.projectId,
                    files: data.files,
                    previewUrl: data.preview.previewUrl,
                })
            } else if (data.singleFile) {
                setCodingResult({
                    mode: "single-file",
                    projectId: data.projectId,
                    fileName: data.singleFile.filename,
                    language: data.singleFile.language,
                    code: data.singleFile.code,
                })
            } else {
                throw new Error("Coding agent returned an incomplete payload.")
            }

            setCodingState("done")
            completeAgentRun("coding", `Prepared ${data.projectId} for handoff and follow-on integration.`)
        } catch (error: unknown) {
            const message = getErrorMessage(error, "Coding agent failed")
            setCodingError(message)
            setCodingState("error")
            failAgentRun("coding", message)
        }
    }

    const runDocumentAgent = async () => {
        if (!walletAddress || !documentFile || documentState === "running") return

        setDocumentState("running")
        setDocumentError(null)
        setDocumentResult(null)
        startAgentRun("document", `Analyzing ${documentFile.name}`)

        try {
            const formData = new FormData()
            formData.append("file", documentFile)
            formData.append("question", documentQuestion)

            const response = await fetch("/api/analyze-document", {
                method: "POST",
                body: formData,
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Document analysis failed")

            setDocumentResult({
                fileName: data.fileName,
                fileType: data.fileType,
                analysis: data.analysis,
                truncated: Boolean(data.truncated),
            })
            setDocumentState("done")
            completeAgentRun("document", `Analyzed ${data.fileName} and prepared a concise brief.`)
        } catch (error: unknown) {
            const message = getErrorMessage(error, "Document analysis failed")
            setDocumentError(message)
            setDocumentState("error")
            failAgentRun("document", message)
        }
    }

    return (
        <div className="workspace-shell">
            <section className="workspace-hero">
                <div>
                    <div className="eyebrow">Web3 MVP workspace</div>
                    <h1 className="page-title mt-2">Three agents, one clean operating surface.</h1>
                    <p className="page-copy mt-3">
                        The workspace is now focused on the GitHub, Coding, and Document agents, with your Stellar wallet
                        address acting as the primary identity for every agent workflow.
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <WorkspaceStat label="Agents" value="3" />
                    <WorkspaceStat label="Wallet" value={walletAddress ? shortWalletAddress ?? "Connected" : "Required"} />
                    <WorkspaceStat label="Balance" value={walletAddress ? `${walletBalance ?? "0.0000000"} XLM` : "Testnet"} />
                </div>
            </section>

            {!walletAddress && (
                <section className="panel mb-6 flex flex-col gap-4 rounded-3xl border-dashed px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-sm font-semibold text-foreground">Connect a Stellar wallet to unlock the agents</div>
                        <p className="mt-1 text-sm text-foreground-soft">
                            GitHub, Coding, and Document actions stay gated until a testnet wallet is connected.
                        </p>
                    </div>
                    <ConnectWalletButton className="button-primary" />
                </section>
            )}

            <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="panel p-3 sm:p-4">
                    <div className="eyebrow px-2">Active stack</div>
                    <div className="mt-3 space-y-2">
                        {AGENTS.map((agent) => {
                            const Icon = agent.icon
                            const active = agent.id === selectedAgentId

                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => setSelectedAgentId(agent.id)}
                                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                                        active ? "bg-primary-soft ring-1 ring-[color:var(--ring)]" : "hover:bg-surface-elevated"
                                    }`}
                                >
                                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                        active ? "bg-[color:var(--primary)] text-white" : "bg-surface-elevated text-primary"
                                    }`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-foreground">{agent.label}</div>
                                        <div className="mt-1 text-xs text-muted">{agent.badge}</div>
                                        <p className="mt-2 text-sm leading-relaxed text-foreground-soft">{agent.description}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </aside>

                <div className="space-y-6">
                    {selectedAgent.id === "github" && <GitHubAgent />}

                    {selectedAgent.id === "coding" && (
                        <section className="panel overflow-hidden">
                            <div className="workspace-panel-head">
                                <div>
                                    <div className="eyebrow">Coding Agent</div>
                                    <h2 className="mt-1 text-xl font-semibold text-foreground">Generate the next build surface</h2>
                                </div>
                                <div className="workspace-chip">
                                    <Sparkles size={14} />
                                    Smart-contract ready handoff
                                </div>
                            </div>

                            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">Task prompt</label>
                                        <textarea
                                            value={codingPrompt}
                                            onChange={(event) => setCodingPrompt(event.target.value)}
                                            rows={8}
                                            placeholder="Build a lightweight Web3 onboarding dashboard with wallet status, task queue, and contract deployment checklist."
                                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-[color:var(--ring)]"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">Output format</label>
                                        <select
                                            value={codingLanguage}
                                            onChange={(event) => setCodingLanguage(event.target.value)}
                                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-[color:var(--ring)]"
                                        >
                                            <option value="html-css-js">HTML / CSS / JS project</option>
                                            <option value="typescript">TypeScript</option>
                                            <option value="javascript">JavaScript</option>
                                            <option value="react">React</option>
                                            <option value="python">Python</option>
                                            <option value="go">Go</option>
                                            <option value="rust">Rust</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => void runCodingAgent()}
                                            disabled={!walletAddress || !codingPrompt.trim() || codingState === "running"}
                                            className="button-primary disabled:opacity-50"
                                        >
                                            {codingState === "running" ? <Loader2 size={15} className="animate-spin" /> : <Braces size={15} />}
                                            {codingState === "running" ? "Generating" : "Run Coding Agent"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCodingPrompt("")
                                                setCodingResult(null)
                                                setCodingError(null)
                                                setCodingState("idle")
                                            }}
                                            className="button-secondary"
                                        >
                                            Reset
                                        </button>
                                    </div>

                                    {codingError && <ErrorBox message={codingError} />}
                                    {!walletAddress && (
                                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                                            Connect a wallet before generating code artifacts.
                                        </div>
                                    )}
                                </div>

                                <div className="workspace-result-card">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="eyebrow">Output</div>
                                            <div className="mt-1 text-sm font-semibold text-foreground">Build summary</div>
                                        </div>
                                        <StatusPill state={codingState} />
                                    </div>

                                    {codingState === "running" && <LoadingCopy text="Generating project artifacts..." />}

                                    {!codingResult && codingState !== "running" && (
                                        <EmptyState
                                            icon={Box}
                                            title="No generated output yet"
                                            body="Run the Coding Agent to produce a project preview or a single-file artifact for the next implementation step."
                                        />
                                    )}

                                    {codingResult?.mode === "project" && (
                                        <div className="space-y-4">
                                            <div className="rounded-xl border border-border bg-background p-4">
                                                <div className="text-sm font-semibold text-foreground">{codingResult.projectId}</div>
                                                <div className="mt-1 text-sm text-foreground-soft">
                                                    Frontend project prepared with HTML, CSS, and JavaScript assets.
                                                </div>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <a href={codingResult.previewUrl} target="_blank" rel="noreferrer" className="button-secondary">
                                                    <ExternalLink size={14} />
                                                    Open Preview
                                                </a>
                                                <a href={`/api/download/${codingResult.projectId}`} className="button-secondary">
                                                    <Download size={14} />
                                                    Download Bundle
                                                </a>
                                            </div>
                                            <CodePreviewTabs files={codingResult.files} />
                                        </div>
                                    )}

                                    {codingResult?.mode === "single-file" && (
                                        <div className="space-y-4">
                                            <div className="rounded-xl border border-border bg-background p-4">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                    <FileCode2 size={15} className="text-primary" />
                                                    {codingResult.fileName}
                                                </div>
                                                <div className="mt-1 text-sm text-foreground-soft">
                                                    Generated in {codingResult.language} and saved under {codingResult.projectId}.
                                                </div>
                                            </div>
                                            <a href={`/api/download/${codingResult.projectId}`} className="button-secondary w-full">
                                                <Download size={14} />
                                                Download Source
                                            </a>
                                            <pre className="max-h-[480px] overflow-auto rounded-xl border border-border bg-[#0d1117] p-4 text-xs text-gray-200">
                                                <code>{codingResult.code}</code>
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {selectedAgent.id === "document" && (
                        <section className="panel overflow-hidden">
                            <div className="workspace-panel-head">
                                <div>
                                    <div className="eyebrow">Document Agent</div>
                                    <h2 className="mt-1 text-xl font-semibold text-foreground">Turn docs into implementation context</h2>
                                </div>
                                <div className="workspace-chip">
                                    <Layers3 size={14} />
                                    Specs, briefs, and datasets
                                </div>
                            </div>

                            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                                <div className="space-y-4">
                                    <label className="workspace-upload">
                                        <Upload size={18} className="text-primary" />
                                        <div>
                                            <div className="text-sm font-semibold text-foreground">
                                                {documentFile ? documentFile.name : "Upload a project document"}
                                            </div>
                                            <div className="mt-1 text-sm text-foreground-soft">
                                                Supports PDF, Excel, CSV, JSON, and TXT files.
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".pdf,.xlsx,.xls,.csv,.json,.txt"
                                            onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                                            className="hidden"
                                        />
                                    </label>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">Question or focus area</label>
                                        <textarea
                                            value={documentQuestion}
                                            onChange={(event) => setDocumentQuestion(event.target.value)}
                                            rows={6}
                                            placeholder="Summarize the product requirements and list the implementation constraints that matter for Web3 integration."
                                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-[color:var(--ring)]"
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => void runDocumentAgent()}
                                            disabled={!walletAddress || !documentFile || documentState === "running"}
                                            className="button-primary disabled:opacity-50"
                                        >
                                            {documentState === "running" ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                                            {documentState === "running" ? "Analyzing" : "Run Document Agent"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDocumentFile(null)
                                                setDocumentQuestion("")
                                                setDocumentResult(null)
                                                setDocumentError(null)
                                                setDocumentState("idle")
                                            }}
                                            className="button-secondary"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    {documentError && <ErrorBox message={documentError} />}
                                    {!walletAddress && (
                                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                                            Connect a wallet before uploading and analyzing documents.
                                        </div>
                                    )}
                                </div>

                                <div className="workspace-result-card">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="eyebrow">Analysis</div>
                                            <div className="mt-1 text-sm font-semibold text-foreground">Processed document output</div>
                                        </div>
                                        <StatusPill state={documentState} />
                                    </div>

                                    {documentState === "running" && <LoadingCopy text="Parsing and analyzing the document..." />}

                                    {!documentResult && documentState !== "running" && (
                                        <EmptyState
                                            icon={FileText}
                                            title="No document analysis yet"
                                            body="Upload a source document to extract constraints, requirements, or implementation notes for the team."
                                        />
                                    )}

                                    {documentResult && (
                                        <div className="space-y-4">
                                            <div className="rounded-xl border border-border bg-background p-4 text-sm">
                                                <div className="font-semibold text-foreground">{documentResult.fileName}</div>
                                                <div className="mt-1 text-foreground-soft">
                                                    Detected type: <span className="uppercase">{documentResult.fileType}</span>
                                                </div>
                                                {documentResult.truncated && (
                                                    <div className="mt-2 text-xs text-warning">
                                                        Content was trimmed to fit the analysis window.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                                <ReactMarkdown components={mdComponents}>{documentResult.analysis}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </section>
        </div>
    )
}

function WorkspaceStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border bg-surface px-4 py-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</div>
            <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
        </div>
    )
}

function StatusPill({ state }: { state: RunState }) {
    const label =
        state === "running" ? "Running" :
        state === "done" ? "Ready" :
        state === "error" ? "Needs attention" :
        "Idle"

    const tone =
        state === "running" ? "bg-primary-soft text-primary" :
        state === "done" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
        state === "error" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
        "bg-surface-elevated text-muted"

    return <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{label}</span>
}

function LoadingCopy({ text }: { text: string }) {
    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm text-foreground-soft">
                <Loader2 size={15} className="animate-spin text-primary" />
                {text}
            </div>
        </div>
    )
}

function EmptyState({
    icon: Icon,
    title,
    body,
}: {
    icon: React.ElementType
    title: string
    body: string
}) {
    return (
        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon size={20} />
            </div>
            <div className="mt-4 text-sm font-semibold text-foreground">{title}</div>
            <p className="mt-2 text-sm leading-relaxed text-foreground-soft">{body}</p>
        </div>
    )
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{message}</span>
            </div>
        </div>
    )
}

function CodePreviewTabs({ files }: { files: GeneratedFiles }) {
    const [activeTab, setActiveTab] = useState<keyof GeneratedFiles>("html")

    const labels: Record<keyof GeneratedFiles, string> = {
        html: "HTML",
        css: "CSS",
        js: "JS",
    }

    return (
        <div className="rounded-xl border border-border">
            <div className="flex border-b border-border">
                {Object.entries(labels).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as keyof GeneratedFiles)}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] ${
                            activeTab === key ? "bg-surface-elevated text-foreground" : "text-muted"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <pre className="max-h-[380px] overflow-auto bg-[#0d1117] p-4 text-xs text-gray-200">
                <code>{files[activeTab]}</code>
            </pre>
        </div>
    )
}

const mdComponents: Components = {
    h2: ({ children }) => <h2 className="mt-5 border-b border-border pb-2 text-base font-semibold text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-4 text-sm font-semibold text-foreground">{children}</h3>,
    p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-foreground-soft">{children}</p>,
    ul: ({ children }) => <ul className="mb-4 space-y-2">{children}</ul>,
    li: ({ children }) => (
        <li className="flex items-start gap-2 text-sm text-foreground-soft">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />
            <span>{children}</span>
        </li>
    ),
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
}
