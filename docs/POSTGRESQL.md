# PostgreSQL production database

Lightworld Technologies website uses PostgreSQL as its primary production database.

## Production layout

- Database: `lightworld_website_db`
- Database role: `lightworld_website_user`
- PostgreSQL runs locally on the VPS and the website connects through the local Unix socket.
- The production `DATABASE_URL` is stored only in the protected shared environment.
- Production database credentials must never be committed to the repository.

## Schema deployment

Generate Prisma and synchronize the PostgreSQL schema:

```bash
bunx prisma generate
bun run db:deploy
```

The historical `db:phase*` scripts were used during the SQLite era. They remain for audit/history and are not the PostgreSQL deployment path.

## Cutover controls

Before a production database cutover:

1. Back up the current database.
2. Back up the destination PostgreSQL database.
3. Rehearse the SQLite-to-PostgreSQL data copy.
4. Compare all table row counts and critical credential hashes without printing secrets.
5. Validate a candidate release against PostgreSQL.
6. Switch production only after the candidate passes.

Keep the final SQLite snapshot and the pre-migration PostgreSQL dump as rollback artifacts until PostgreSQL operation and backups have been verified.
