"""Quick check that the Phase 9 RAG schema landed on the live DB."""
import os
import psycopg2

dsn = os.environ.get(
    "PG_DSN",
    "dbname=oraone user=oraone_admin password=6301655098 host=127.0.0.1 port=15432",
)
c = psycopg2.connect(dsn)
cur = c.cursor()

cur.execute("select extname from pg_extension where extname='vector'")
print("vector_ext =", cur.fetchone())

cur.execute(
    "select column_name, udt_name from information_schema.columns "
    "where table_name='document_chunks' and column_name='embedding'"
)
print("embedding_col =", cur.fetchall())

cur.execute(
    "select indexname, indexdef from pg_indexes "
    "where tablename='document_chunks' and indexname='idx_document_chunks_embedding'"
)
print("hnsw_index =", cur.fetchall())

cur.execute("select version_num from alembic_version")
print("alembic_version =", cur.fetchone())

cur.close()
c.close()
