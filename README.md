# WatchGuard Migration Hub

Internal operations MVP for the Dolos Panda → WatchGuard migration programme.

The UI is intentionally aligned to the visual language of Dolos' existing **WatchTower Distributor Management Platform**: dark left navigation, red operational accent, compact status cards, exception-first dashboard and dense but readable tables.

## MVP scope

This first version is deliberately a **smart tracker / workflow control centre**, not an attempt to automate WatchGuard account creation.

It includes:

- Partner-level migration projects
- Migration stages and status tracking
- Owner workload dashboard
- Exception / overdue / waiting-on-customer / waiting-on-WatchGuard views
- System-derived next actions
- Migration readiness gate
- Panda Cloud Partner Center customer export import (`.xls` and `.xlsx`)
- Customer account preparation tracking
- Manual WatchGuard customer Account ID capture
- WatchGuard migration template generation once all account mappings are ready
- Local JSON backup
- WatchTower integration placeholder and architecture seam

## Important data/security note

The repository contains **fictional demo data only**.

The MVP stores imported migration data in the browser's `localStorage`. Panda exports are parsed locally in the browser and are not uploaded to GitHub or to a backend service.

That makes this suitable for UI/process validation, but **localStorage is not the production system of record**. Before team rollout, persistence and authentication should move to one of:

1. the existing WatchTower backend, if its architecture/API is suitable; or
2. Microsoft Lists / SharePoint via Microsoft Graph and Entra ID.

No real customer data should be committed to this public repository.

## Migration pipeline

1. Identified
2. Partner Preparation
3. Account Preparation
4. Technical Migration Requested
5. Migration In Progress
6. Validation
7. Completed

The Hub currently treats WatchGuard account creation as a human task. It tracks completion and Account IDs but does not call the WatchGuard API to create accounts.

## Panda import

From **Import Panda**:

1. Choose the partner migration.
2. Upload the Panda Cloud Partner Center client export.
3. Review detected customer records.
4. Import them into the migration.
5. Manually create / have the customer create the WatchGuard subscriber accounts.
6. Enter each returned `WGC-...` Account ID.

The importer detects common variants of fields such as customer name, Panda Identifier, product, licence count and Global Customer Identifier.

## WatchGuard template generation

On a migration record, **Generate WG template** becomes useful once:

- the partner `ACC-...` Service Provider Account ID is captured; and
- every imported customer has a `WGC-...` WatchGuard Account ID.

The generated workbook uses the current migration mapping structure:

- `ServiceProvider` row for the partner
- `Subscriber` rows for customer accounts
- `EndpointsAndLicenses`
- `LinkedToLicense`

Template generation should be validated against the latest WatchGuard-supplied template before production use.

## WatchTower integration direction

The preferred end state is **not two unrelated platforms**.

### Phase 1 — now

Migration Hub is standalone but visually compatible with WatchTower.

### Phase 2 — data integration

Once WatchTower source/API access is available:

- share Partner IDs / WatchGuard Account IDs
- deep-link licensing and migration records
- reuse authenticated user/owner information where appropriate
- avoid duplicate partner master data

### Phase 3 — platform fusion

If the WatchTower architecture is maintainable, Migration Hub can become a WatchTower module with:

- shared authentication
- shared partner/customer model
- shared navigation
- migration dashboard / tasks / import workflow
- WatchTower Migration Insights backed by live Migration Hub data

An iframe-style integration is intentionally not recommended as the target architecture.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL shown by Vite.

## Build

```bash
npm run build
```

## GitHub Pages

A Pages deployment workflow is included at `.github/workflows/deploy-pages.yml`.

For first deployment, enable **GitHub Pages → Source: GitHub Actions** in the repository settings. The project is configured with the repository base path when running in GitHub Actions.

## Next production milestones

- Validate the migration workflow with the Dolos team
- Confirm post-submission WatchGuard workflow and validation/closure rules
- Inspect WatchTower's codebase/API/data model
- Decide whether WatchTower or Microsoft Lists becomes the system of record
- Add Entra ID / shared WatchTower authentication
- Replace browser storage with a persistent shared backend
- Add audit/activity history
- Add email/Teams follow-up automation
- Add real WatchGuard API integrations only after the manual workflow is stable
