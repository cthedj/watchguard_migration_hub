import { runtimeConfig } from '../config/runtime'

const LOCAL_STORAGE_KEY = 'dolos.wgMigrationHub.migrations.v1'
const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0'

const dateOnly = value => value ? String(value).slice(0, 10) : ''
const bool = value => value === true || String(value).toLowerCase() === 'true'

function localRepository() {
  const read = fallback => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      return stored ? JSON.parse(stored) : fallback
    } catch {
      return fallback
    }
  }

  const write = data => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))

  return {
    mode: 'local',
    async list(fallback = []) { return read(fallback) },
    async create(migration, fallback = []) {
      const data = read(fallback)
      write([...data, migration])
      return migration
    },
    async update(migration, fallback = []) {
      const data = read(fallback)
      write(data.map(x => x.id === migration.id ? migration : x))
      return migration
    },
    async remove(id, fallback = []) {
      const data = read(fallback)
      write(data.filter(x => x.id !== id))
    },
    async replaceAccounts(id, accounts, fallback = []) {
      const data = read(fallback)
      const next = data.map(x => x.id === id ? { ...x, accounts } : x)
      write(next)
      return next.find(x => x.id === id)
    },
    async appendActivity() {},
    reset() { localStorage.removeItem(LOCAL_STORAGE_KEY) },
  }
}

function sharePointRepository(getAccessToken) {
  if (typeof getAccessToken !== 'function') throw new Error('SharePoint data access requires a Microsoft Graph access-token provider.')

  const { siteId, migrationsListId, accountsListId, activityListId } = runtimeConfig.graph

  const graph = async (path, options = {}) => {
    const token = await getAccessToken()
    const response = await fetch(path.startsWith('http') ? path : `${GRAPH_ROOT}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Microsoft Graph ${response.status}: ${body || response.statusText}`)
    }

    if (response.status === 204) return null
    return response.json()
  }

  const listBase = listId => `/sites/${siteId}/lists/${encodeURIComponent(listId)}/items`

  const listAll = async listId => {
    let url = `${listBase(listId)}?$expand=fields&$top=999`
    const rows = []
    while (url) {
      const page = await graph(url)
      rows.push(...(page.value || []))
      url = page['@odata.nextLink'] || ''
    }
    return rows
  }

  const createItem = (listId, fields) => graph(listBase(listId), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })

  const updateItem = (listId, itemId, fields) => graph(`${listBase(listId)}/${itemId}/fields`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })

  const deleteItem = (listId, itemId) => graph(`${listBase(listId)}/${itemId}`, { method: 'DELETE' })

  const migrationFields = m => ({
    Title: m.partner || '',
    MigrationKey: m.id,
    OwnerName: m.owner || '',
    Stage: m.stage || 'Identified',
    WaitOn: m.waitOn || 'Dolos',
    TargetDate: m.target || null,
    LastActivityDate: m.last || null,
    WatchGuardSPAccountId: m.wg || '',
    PartnerBuyIn: Boolean(m.buyIn),
    LoginVerified: Boolean(m.login),
    NFRStatus: m.nfr || 'Not Requested',
    DolosAliasCreated: Boolean(m.alias),
    DolosOperatorCreated: Boolean(m.operator),
    Notes: m.notes || '',
    Blocker: m.blocker || '',
  })

  const accountFields = (migrationId, a) => ({
    Title: a.name || '',
    AccountKey: a.id,
    MigrationKey: migrationId,
    PandaCustomerId: a.panda || '',
    Product: a.product || '',
    LicenseQuantity: a.licenses === '' || a.licenses == null ? null : Number(a.licenses),
    GlobalCustomerId: a.globalId || '',
    WatchGuardCustomerAccountId: a.wg || '',
  })

  const itemToMigration = item => {
    const f = item.fields || {}
    return {
      id: f.MigrationKey || String(item.id),
      _spItemId: item.id,
      partner: f.Title || '',
      owner: f.OwnerName || '',
      stage: f.Stage || 'Identified',
      waitOn: f.WaitOn || 'Dolos',
      target: dateOnly(f.TargetDate),
      last: dateOnly(f.LastActivityDate),
      wg: f.WatchGuardSPAccountId || '',
      buyIn: bool(f.PartnerBuyIn),
      login: bool(f.LoginVerified),
      nfr: f.NFRStatus || 'Not Requested',
      alias: bool(f.DolosAliasCreated),
      operator: bool(f.DolosOperatorCreated),
      notes: f.Notes || '',
      blocker: f.Blocker || '',
      accounts: [],
    }
  }

  const itemToAccount = item => {
    const f = item.fields || {}
    return {
      id: f.AccountKey || String(item.id),
      _spItemId: item.id,
      _migrationKey: f.MigrationKey || '',
      name: f.Title || '',
      panda: f.PandaCustomerId || '',
      product: f.Product || '',
      licenses: f.LicenseQuantity ?? '',
      globalId: f.GlobalCustomerId || '',
      wg: f.WatchGuardCustomerAccountId || '',
    }
  }

  const syncAccounts = async migration => {
    const existingItems = await listAll(accountsListId)
    const existing = existingItems
      .map(itemToAccount)
      .filter(a => a._migrationKey === migration.id)

    const existingByKey = new Map(existing.map(a => [a.id, a]))
    const desiredKeys = new Set((migration.accounts || []).map(a => a.id))
    const savedAccounts = []

    for (const account of migration.accounts || []) {
      const current = existingByKey.get(account.id)
      if (current?._spItemId) {
        await updateItem(accountsListId, current._spItemId, accountFields(migration.id, account))
        savedAccounts.push({ ...account, _spItemId: current._spItemId })
      } else {
        const created = await createItem(accountsListId, accountFields(migration.id, account))
        savedAccounts.push({ ...account, _spItemId: created.id })
      }
    }

    for (const account of existing) {
      if (!desiredKeys.has(account.id) && account._spItemId) await deleteItem(accountsListId, account._spItemId)
    }

    return savedAccounts
  }

  return {
    mode: 'sharepoint',

    async list() {
      const [migrationItems, accountItems] = await Promise.all([
        listAll(migrationsListId),
        listAll(accountsListId),
      ])
      const migrations = migrationItems.map(itemToMigration)
      const accounts = accountItems.map(itemToAccount)
      const byMigration = new Map()
      for (const account of accounts) {
        if (!byMigration.has(account._migrationKey)) byMigration.set(account._migrationKey, [])
        byMigration.get(account._migrationKey).push(account)
      }
      return migrations.map(m => ({ ...m, accounts: byMigration.get(m.id) || [] }))
    },

    async create(migration) {
      const created = await createItem(migrationsListId, migrationFields(migration))
      const withId = { ...migration, _spItemId: created.id }
      const accounts = await syncAccounts(withId)
      return { ...withId, accounts }
    },

    async update(migration) {
      let itemId = migration._spItemId
      if (!itemId) {
        const matches = (await listAll(migrationsListId))
          .filter(x => x.fields?.MigrationKey === migration.id)
        itemId = matches[0]?.id
      }
      if (!itemId) return this.create(migration)
      await updateItem(migrationsListId, itemId, migrationFields(migration))
      const accounts = await syncAccounts({ ...migration, _spItemId: itemId })
      return { ...migration, _spItemId: itemId, accounts }
    },

    async remove(id) {
      const [migrationItems, accountItems] = await Promise.all([
        listAll(migrationsListId),
        listAll(accountsListId),
      ])
      const migration = migrationItems.find(x => x.fields?.MigrationKey === id)
      const accounts = accountItems.filter(x => x.fields?.MigrationKey === id)
      await Promise.all(accounts.map(x => deleteItem(accountsListId, x.id)))
      if (migration) await deleteItem(migrationsListId, migration.id)
    },

    async replaceAccounts(id, accounts) {
      const migrations = await this.list()
      const migration = migrations.find(x => x.id === id)
      if (!migration) throw new Error('Migration was not found in SharePoint.')
      return this.update({ ...migration, accounts })
    },

    async appendActivity({ migrationId, action, summary, actor }) {
      if (!activityListId) return
      await createItem(activityListId, {
        Title: action || 'Activity',
        MigrationKey: migrationId || '',
        Summary: summary || '',
        ActorName: actor?.name || '',
        ActorUPN: actor?.username || '',
        ActivityDate: new Date().toISOString(),
      })
    },
  }
}

export function createMigrationRepository({ getAccessToken } = {}) {
  return runtimeConfig.dataProvider === 'sharepoint'
    ? sharePointRepository(getAccessToken)
    : localRepository()
}
