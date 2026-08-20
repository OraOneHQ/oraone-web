"""Seed a demo, embedded knowledge base into a real org for UI testing.

Usage (with the SSH tunnel up + EMBEDDING_PROVIDER=hash):

    ORG_ID=8aba69e1-b3ed-4628-8ad3-554cc692d80b python scripts/seed_demo_kb.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("EMBEDDING_PROVIDER", "hash")
os.environ.setdefault("EMBED_DIM", "1024")

ORG_ID = uuid.UUID(os.environ["ORG_ID"])

DOCS = {
    "OraOne Employee Handbook.pdf": [
        ("New employee onboarding at OraOne requires a signed NDA and a company "
         "laptop request submitted to the IT service desk on the first day.", 1),
        ("Expense reports must be filed within thirty days through the Concur "
         "portal and approved by your direct manager before reimbursement.", 2),
        ("OraOne offers twenty-five days of paid annual leave plus public "
         "holidays; leave is requested through the HR self-service portal.", 3),
    ],
    "OraOne Security Policy.pdf": [
        ("Password rotation is mandatory every ninety days for all production "
         "systems and privileged administrator accounts.", 1),
        ("All customer data is encrypted at rest with AES-256 and in transit "
         "using TLS 1.2 or higher.", 2),
    ],
}


async def main() -> None:
    from app.database.session import init_engine
    init_engine()
    from app.database.session import AsyncSessionLocal
    from app.database.models.knowledge_base import KnowledgeBase, KnowledgeBaseStatus
    from app.database.models.document import Document, DocumentStatus
    from app.database.models.document_chunk import DocumentChunk
    from app.providers.embeddings import get_embedding_provider

    provider = get_embedding_provider()
    print(f"Embedding provider: {provider.name} (dim={provider.dim})")

    async with AsyncSessionLocal() as s:
        kb = KnowledgeBase(
            organization_id=ORG_ID,
            name="Company Handbook (Demo)",
            description="Demo knowledge base for RAG testing.",
            status=KnowledgeBaseStatus.active,
        )
        s.add(kb)
        await s.flush()

        total_chunks = 0
        for filename, chunks in DOCS.items():
            doc = Document(
                knowledge_base_id=kb.id, organization_id=ORG_ID,
                filename=filename, file_type="application/pdf",
                s3_key=f"demo/{uuid.uuid4()}.pdf", status=DocumentStatus.processed,
                processing_completed_at=datetime.now(timezone.utc),
            )
            s.add(doc)
            await s.flush()
            vectors = provider.embed([c[0] for c in chunks])
            for i, ((text, page), vec) in enumerate(zip(chunks, vectors)):
                s.add(DocumentChunk(
                    document_id=doc.id, chunk_index=i, content=text,
                    chunk_metadata={"page": page}, embedding=vec,
                ))
                total_chunks += 1
            print(f"  + {filename}: {len(chunks)} chunks")

        await s.commit()
        print(f"\nSeeded KB {kb.id} into org {ORG_ID} "
              f"({len(DOCS)} docs / {total_chunks} embedded chunks).")


if __name__ == "__main__":
    asyncio.run(main())
