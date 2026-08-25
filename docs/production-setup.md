# Production Setup

This document defines the target Production v1 architecture for the WatchGuard Migration Hub.

## Target architecture

```text
Dolos user
   |
   | HTTPS
   v
https://migrationhub.dolos.africa
   |
Internal DNS -> internal Windows VM / IIS
   |
React Migration Hub
   |
Microsoft Entra ID authentication
   |
WG Migration Hub Users security group
   |
Microsoft Graph
   |
Private SharePoint site / Microsoft Lists
```

The web server only serves the compiled React application. It does not need a SQL database or a Node.js application service.

## Environments

### Demo / development

```env
VITE_APP_ENV=development
VITE_AUTH_MODE=demo
VITE_DATA_PROVIDER=local
```

This is the mode used by the public GitHub Pages prototype. Data stays in browser localStorage and only fictional demo data belongs in the repository.

### Production

```env
VITE_APP_ENV=production
VITE_AUTH_MODE=entra
VITE_DATA_PROVIDER=sharepoint
```

Production additionally requires the Entra and SharePoint IDs shown in `.env.example`.

## Microsoft Entra application registration

Create one single-tenant application registration named:

**WatchGuard Migration Hub**

Recommended configuration:

1. Supported account type: accounts in the Dolos tenant only.
2. Platform: **Single-page application (SPA)**.
3. Redirect URI: `https://migrationhub.dolos.africa/`.
4. Do **not** create a client secret for the browser application. A SPA cannot safely hold a client secret.
5. Record:
   - Directory (tenant) ID -> `VITE_ENTRA_TENANT_ID`
   - Application (client) ID -> `VITE_ENTRA_CLIENT_ID`

## Access group

Create an Entra security group:

**WG Migration Hub Users**

Add the staff who are allowed to use the Hub.

Record the group's Object ID as:

```env
VITE_ENTRA_ALLOWED_GROUP_ID=<group object id>
```

### Token group claim

Configure the app registration token to emit **Security groups** in the group claim. The application checks the signed-in user's `groups` claim against `VITE_ENTRA_ALLOWED_GROUP_ID`.

For users who belong to enough groups to trigger Entra group-claim overage, the code currently blocks access and reports that a Graph fallback check is required. A fallback membership check should be added before the production pilot if any pilot user hits this condition.

## Microsoft Graph permissions

The target model is least privilege.

The application needs:

- `User.Read`
- `Lists.SelectedOperations.Selected`

Selected-list access must then be explicitly granted to the Migration Hub application for the Migration Hub Lists.

If selected-list permissions prove impractical in the tenant during initial setup, a broader delegated SharePoint permission may be used temporarily for the pilot only, with a task created to reduce it before full rollout.

## SharePoint data site

Create a private SharePoint site dedicated to application data. Suggested name:

**WatchGuard Migration Hub Data**

Normal staff should use the Migration Hub interface rather than working directly in the Lists.

Create Lists according to `docs/sharepoint-schema.md` and record:

```env
VITE_GRAPH_SITE_ID=<site id>
VITE_GRAPH_MIGRATIONS_LIST_ID=<list id>
VITE_GRAPH_ACCOUNTS_LIST_ID=<list id>
VITE_GRAPH_ACTIVITY_LIST_ID=<list id>
VITE_GRAPH_TASKS_LIST_ID=<list id>
```

## Internal DNS

Create an internal DNS record:

```text
migrationhub.dolos.africa -> <internal VM IP>
```

The VM does not need to be exposed as a public web server.

## HTTPS

Use a public certificate for `migrationhub.dolos.africa`, preferably Let's Encrypt using DNS-01 validation.

DNS validation allows certificate issuance and renewal without exposing IIS to inbound internet traffic.

For Windows/IIS, win-acme is a suitable ACME client. Configure automatic certificate renewal and IIS binding renewal.

## IIS deployment

Production build:

```bash
npm install
npm run build
```

Deploy the contents of `dist/` to the IIS site root.

The IIS site should:

- listen on HTTPS only for normal use;
- bind the `migrationhub.dolos.africa` certificate;
- optionally redirect HTTP to HTTPS;
- be reachable only from the approved internal networks/VPN;
- serve `index.html` as the SPA entry point.

## Environment configuration

Vite environment variables are compiled into the frontend bundle. None of the `VITE_...` values should be treated as secrets.

Do not put passwords, API secrets, certificate private keys or client secrets in Vite environment variables.

The Client ID, Tenant ID, Group Object ID, Site ID and List IDs are identifiers, not credentials. Access is enforced by Entra tokens and Microsoft 365 permissions.

## Production cutover gate

Do not use the Hub as the official system of record until all of these are true:

- Entra login works for an allowed user.
- A non-member is denied.
- HTTPS is valid with no browser warning.
- Production is not publicly reachable except through approved network paths.
- Migration records are shared across two different users/browsers.
- Panda import has duplicate protection.
- Migration template generation has been validated against a current WatchGuard template.
- Activity history is written for material changes.
- SharePoint data permissions are least privilege.
- A backup/export procedure has been tested.
- Existing `WG Migrations.xlsx` data has been imported and reconciled using a copy, not by altering the production workbook.
