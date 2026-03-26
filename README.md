# Excera

Excera is a multi-agent workspace built around a Stellar wallet identity. It brings focused AI workflows into one product surface so users can run tasks, review outputs, and track escrowed task state on Soroban.

## Live App

- Live URL: `ADD_LIVE_URL_HERE`

## What It Does

Excera currently includes:

- `GitHub Agent` for repository indexing, code Q&A, and review workflows
- `Coding Agent` for generating project files and preview-ready outputs
- `Document Agent` for analyzing PDFs, spreadsheets, CSV, JSON, and text files
- wallet-based identity using supported Stellar wallets
- Soroban escrow tracking for task creation, completion, and cancellation
- Supabase-backed task history and activity records

## User Feedback

We collected feedback from 5+ testnet users.

📄 [View Feedback Sheet](./feedback doc/user-feedback.xlsx)

📋 [Submit Feedback](https://forms.gle/qXJ3EdkhUz9A95eN9)

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Supabase`
- `Soroban / Stellar SDK`
- `Freighter`, `xBull`, and `Albedo` wallet support

## Stellar And Soroban Deployment

This project is configured for `Stellar Testnet`.

### Network

- Network: `testnet`
- RPC URL: `https://soroban-testnet.stellar.org`
- Network Passphrase: `Test SDF Network ; September 2015`
- Explorer base: `https://stellar.expert/explorer/testnet`

### Deployed Contract

- Soroban Contract ID: `CDXU5JFTCBO4AKPI2TVQ2BGC352IYXMOIIGPRYXGK247HHMOALKBLJUP`
- Native XLM Stellar Asset Contract ID: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Contract package path: [`contracts/task_escrow`](c:\Projects\agentforge\contracts\task_escrow)

### Contract Functions

- `init(admin, token_contract)`
- `set_executor(executor, allowed)`
- `is_executor(executor)`
- `create_task(task_id, user, agent_type, reward)`
- `complete_task(task_id, caller, pay_executor)`
- `cancel_task(task_id, caller)`
- `get_task(task_id)`
- `get_admin()`
- `get_token()`

## Environment Variables

Create `.env.local` and add the values your environment needs.

### Required App Variables

```env
OPENAI_API_KEY=your_model_provider_key
```

### GitHub OAuth

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LEGACY_IMPORT_WALLET_ADDRESS=legacy-local-import
```

### Soroban / Stellar Testnet

```env
NEXT_PUBLIC_SOROBAN_CONTRACT_ID=CDXU5JFTCBO4AKPI2TVQ2BGC352IYXMOIIGPRYXGK247HHMOALKBLJUP
NEXT_PUBLIC_SOROBAN_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_STELLAR_XLM_SAC_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Minimal Setup

1. Install dependencies.

```bash
npm install
```

2. Create `.env.local` with your app, GitHub, Supabase, and Soroban values.

3. Run the Supabase schema from [`supabase/schema.sql`](c:\Projects\agentforge\supabase\schema.sql).

4. If your database was created before Soroban fields were added, also run [`supabase/soroban_migration.sql`](c:\Projects\agentforge\supabase\soroban_migration.sql).

5. Start the app.

```bash
npm run dev
```

6. Open `http://localhost:3001`.

## Useful Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run import:legacy-projects
```

## Wallet Flow

- connect a supported Stellar wallet
- create an escrowed task on Soroban before agent work starts
- run the selected agent workflow
- sign the final completion transaction
- review task history and on-chain status in the app

## Project Structure

- [`app`](c:\Projects\agentforge\app): Next.js app routes and API handlers
- [`components`](c:\Projects\agentforge\components): UI components and agent surfaces
- [`lib`](c:\Projects\agentforge\lib): wallet, Soroban, services, and agent logic
- [`contracts/task_escrow`](c:\Projects\agentforge\contracts\task_escrow): Soroban escrow contract
- [`supabase`](c:\Projects\agentforge\supabase): SQL schema and migration files
- [`projects`](c:\Projects\agentforge\projects): generated local coding outputs

## Notes

- This repo currently targets `Stellar Testnet`, not mainnet.
- Do not commit real secrets into `.env.local`.
- The Soroban escrow flow depends on a supported wallet being connected when both create and complete signatures are requested.

## Next Phase Improvement Plan

In Level 6, I plan to add more agents so the product can support a wider range of workflows inside the same wallet-based workspace.

- `Web Search Agent`: fetches live web information, extracts the useful parts, and returns a concise answer or summary with current context.
- `Browser Automation Agent`: opens websites, navigates steps on the user’s behalf, captures page data, and returns structured results from live pages.
- `Email Agent`: drafts clean outbound emails from a short prompt or task context and supports a review-first flow before sending.

## License

`MIT`
