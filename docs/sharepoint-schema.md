# SharePoint / Microsoft Lists Schema

Production v1 uses a dedicated private SharePoint site as the shared application data store.

Keep internal column names exactly as documented where practical. Avoid spaces in custom internal names.

## 1. Migrations

One row per partner-level migration project.

| Column | Type | Required | Notes |
|---|---|---:|---|
| Title | Single line text | Yes | Partner name |
| MigrationKey | Single line text | Yes | Hub-generated immutable migration ID |
| OwnerName | Single line text | No | MVP owner display name; can become an Entra person/object ID later |
| Stage | Choice or single line text | Yes | Pipeline stage |
| WaitOn | Choice or single line text | Yes | Dolos / Customer / WatchGuard / None |
| TargetDate | Date | No | Target completion date |
| LastActivityDate | Date | No | Most recent meaningful workflow activity |
| WatchGuardSPAccountId | Single line text | No | Partner ACC number |
| PartnerBuyIn | Yes/No | Yes | Partner has agreed to proceed |
| LoginVerified | Yes/No | Yes | WatchGuard login tested with partner |
| NFRStatus | Choice or single line text | Yes | Not Requested / Requested / Issued / Activated |
| DolosAliasCreated | Yes/No | Yes | Dolos support alias created |
| DolosOperatorCreated | Yes/No | Yes | Operator created in partner WatchGuard account |
| Notes | Multiple lines text | No | Current working notes |
| Blocker | Single or multiple line text | No | Current blocker, if any |

Recommended index/uniqueness strategy:

- Index `MigrationKey`.
- Treat `MigrationKey` as unique at application level.
- Do not use Panda IDs as primary keys.

## 2. Migration Accounts

One row per Panda customer/subscriber account being mapped into WatchGuard.

| Column | Type | Required | Notes |
|---|---|---:|---|
| Title | Single line text | Yes | Customer/account name |
| AccountKey | Single line text | Yes | Hub-generated immutable account row ID |
| MigrationKey | Single line text | Yes | Parent migration key |
| PandaCustomerId | Single line text | Yes | Panda customer identifier, stored as text |
| Product | Single line text | No | Product from Panda export |
| LicenseQuantity | Number | No | Contracted/current quantity from import when available |
| GlobalCustomerId | Single line text | No | Panda Global Customer Identifier when available |
| WatchGuardCustomerAccountId | Single line text | No | WGC account ID entered after manual account creation |

Recommended indexes:

- `MigrationKey`
- `AccountKey`
- optionally `PandaCustomerId`

Do not enforce uniqueness on `PandaCustomerId`; real migration templates can contain identifiers that are not safe to assume are globally unique business keys.

## 3. Activity

Append-only operational audit history.

| Column | Type | Required | Notes |
|---|---|---:|---|
| Title | Single line text | Yes | Action type, e.g. `Status changed` |
| MigrationKey | Single line text | Yes | Related migration |
| Summary | Multiple lines text | No | Human-readable change description |
| ActorName | Single line text | No | Entra display name |
| ActorUPN | Single line text | No | Entra username/UPN |
| ActivityDate | Date and time | Yes | UTC event timestamp |

Activity should normally be written by the application rather than manually edited.

## 4. Tasks

Production v1 can create the List now even if task automation is enabled later.

| Column | Type | Required | Notes |
|---|---|---:|---|
| Title | Single line text | Yes | Task/action name |
| TaskKey | Single line text | Yes | Immutable Hub task ID |
| MigrationKey | Single line text | Yes | Parent migration |
| OwnerName | Single line text | No | Initial MVP owner |
| Status | Choice | Yes | Open / Waiting / Completed / Cancelled |
| DueDate | Date | No | Due date |
| Dependency | Single line text | No | Customer / WatchGuard / Dolos / None |
| CompletedDate | Date and time | No | Completion timestamp |
| Notes | Multiple lines text | No | Task notes |

## 5. Settings (optional for initial pilot)

A Settings List can later hold controlled values such as:

- migration stage definitions;
- owner aliases;
- SLA/default deadline values;
- migration template defaults;
- feature flags.

For the first pilot, these can remain application configuration if that keeps deployment simpler.

## Relationships

Production v1 deliberately uses immutable text keys (`MigrationKey`) rather than SharePoint Lookup columns between Lists.

Reasons:

- easier Microsoft Graph reads/writes;
- simpler import/migration logic;
- less SharePoint-specific coupling in the React application;
- easier future move to SQL/PostgreSQL if required.

Logical model:

```text
Migration (MigrationKey)
  |
  +-- Migration Accounts (MigrationKey)
  +-- Tasks              (MigrationKey)
  +-- Activity           (MigrationKey)
```

## Data ownership

The SharePoint Lists are the production system of record once the pilot is approved.

The existing `WG Migrations.xlsx` workbook must remain untouched until explicit cutover approval. During pilot it is an upstream/reference source and can be imported from a copy.
