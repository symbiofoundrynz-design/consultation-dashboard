import json
import os
import base64
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles


ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
DB_NAME = os.environ.get("CDASH_DB_NAME", "consultation_dash")
SHARED_ROOT = Path(os.environ.get("CDASH_SHARED_ROOT", str(ROOT / ".local-data")))
UPLOAD_ROOT = SHARED_ROOT / "uploads"
LOGO_ROOT = UPLOAD_ROOT / "logos"
DB_BACKUP_ROOT = Path(os.environ.get("CDASH_BACKUP_ROOT", str(ROOT / ".local-backups")))
CLIENT_TYPES = {"individual", "sole_trader", "business", "organisation", "unknown"}
CLIENT_STATUSES = {"prospect", "active", "paused", "complete", "archived"}
CONSULTANT_STATUSES = {"active", "paused", "retired", "archived"}

app = FastAPI(title="Cdash v1 Core")
_database_shape_checked = False


def run_psql(sql: str) -> str:
    result = subprocess.run(
        ["psql", "-d", DB_NAME, "-v", "ON_ERROR_STOP=1", "-At"],
        input=sql,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.strip() or "Database command failed")
    return result.stdout.strip()


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.strip() or "Command failed")
    return result


def sql_json(value: Any) -> str:
    return "'" + json.dumps(value, separators=(",", ":")).replace("'", "''") + "'::jsonb"


def sql_text(value: Any) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def safe_filename(name: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9._-]+", "-", Path(name).name).strip("-")
    return clean or "logo"


def query_rows(table: str, order_by: str) -> list[dict[str, Any]]:
    sql = f"""
    SELECT COALESCE(json_agg(row_to_json(row_data)), '[]'::json)
    FROM (SELECT * FROM {table} ORDER BY {order_by}) row_data;
    """
    raw = run_psql(sql)
    return json.loads(raw or "[]")


def ensure_database_shape() -> None:
    global _database_shape_checked
    if _database_shape_checked:
        return
    run_psql("""
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS client_registry_clients (
        client_record_ref text PRIMARY KEY,
        display_name text NOT NULL,
        client_type text NOT NULL DEFAULT 'unknown',
        contact_name text NOT NULL DEFAULT '',
        email text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '',
        business_name text NOT NULL DEFAULT '',
        website text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'prospect',
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT client_registry_clients_type_check CHECK (client_type IN ('individual', 'sole_trader', 'business', 'organisation', 'unknown')),
        CONSTRAINT client_registry_clients_status_check CHECK (status IN ('prospect', 'active', 'paused', 'complete', 'archived'))
    );

    CREATE INDEX IF NOT EXISTS client_registry_clients_status_idx ON client_registry_clients(status);
    CREATE INDEX IF NOT EXISTS client_registry_clients_display_name_idx ON client_registry_clients(display_name);

    CREATE TABLE IF NOT EXISTS consultant_registry_consultants (
        consultant_ref text PRIMARY KEY,
        display_name text NOT NULL,
        role text NOT NULL DEFAULT '',
        email text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '',
        organisation text NOT NULL DEFAULT '',
        website text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'active',
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT consultant_registry_consultants_status_check CHECK (status IN ('active', 'paused', 'retired', 'archived'))
    );

    CREATE INDEX IF NOT EXISTS consultant_registry_consultants_status_idx ON consultant_registry_consultants(status);
    CREATE INDEX IF NOT EXISTS consultant_registry_consultants_display_name_idx ON consultant_registry_consultants(display_name);
    """)
    _database_shape_checked = True


def next_client_ref() -> str:
    prefix = f"CL-{datetime.now().strftime('%Y%m%d')}-"
    latest = run_psql(f"""
    SELECT client_record_ref
    FROM client_registry_clients
    WHERE client_record_ref LIKE {sql_text(prefix + '%')}
    ORDER BY client_record_ref DESC
    LIMIT 1;
    """)
    if not latest:
        return f"{prefix}0001"
    try:
        number = int(latest.rsplit("-", 1)[1]) + 1
    except (IndexError, ValueError):
        number = 1
    return f"{prefix}{number:04d}"


def next_consultant_ref() -> str:
    prefix = f"CONS-{datetime.now().strftime('%Y%m%d')}-"
    latest = run_psql(f"""
    SELECT consultant_ref
    FROM consultant_registry_consultants
    WHERE consultant_ref LIKE {sql_text(prefix + '%')}
    ORDER BY consultant_ref DESC
    LIMIT 1;
    """)
    if not latest:
        return f"{prefix}0001"
    try:
        number = int(latest.rsplit("-", 1)[1]) + 1
    except (IndexError, ValueError):
        number = 1
    return f"{prefix}{number:04d}"


def clean_client_payload(payload: dict[str, Any], existing: dict[str, Any] | None = None) -> dict[str, str]:
    base = existing or {}
    display_name = str(payload.get("display_name", base.get("display_name", "")) or "").strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="Client display name is required")

    client_type = str(payload.get("client_type", base.get("client_type", "unknown")) or "unknown").strip()
    status = str(payload.get("status", base.get("status", "prospect")) or "prospect").strip()
    if client_type not in CLIENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid client type")
    if status not in CLIENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid client status")

    return {
        "display_name": display_name,
        "client_type": client_type,
        "contact_name": str(payload.get("contact_name", base.get("contact_name", "")) or "").strip(),
        "email": str(payload.get("email", base.get("email", "")) or "").strip(),
        "phone": str(payload.get("phone", base.get("phone", "")) or "").strip(),
        "business_name": str(payload.get("business_name", base.get("business_name", "")) or "").strip(),
        "website": str(payload.get("website", base.get("website", "")) or "").strip(),
        "status": status,
        "notes": str(payload.get("notes", base.get("notes", "")) or "").strip(),
    }


def get_client_or_404(client_ref: str) -> dict[str, Any]:
    raw = run_psql(f"""
    SELECT COALESCE(row_to_json(row_data), '{{}}'::json)
    FROM (
        SELECT *
        FROM client_registry_clients
        WHERE client_record_ref = {sql_text(client_ref)}
    ) row_data;
    """)
    row = json.loads(raw or "{}")
    if not row:
        raise HTTPException(status_code=404, detail=f"Client not found: {client_ref}")
    return row


def clean_consultant_payload(payload: dict[str, Any], existing: dict[str, Any] | None = None) -> dict[str, str]:
    base = existing or {}
    display_name = str(payload.get("display_name", base.get("display_name", "")) or "").strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="Consultant display name is required")

    status = str(payload.get("status", base.get("status", "active")) or "active").strip()
    if status not in CONSULTANT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid consultant status")

    return {
        "display_name": display_name,
        "role": str(payload.get("role", base.get("role", "")) or "").strip(),
        "email": str(payload.get("email", base.get("email", "")) or "").strip(),
        "phone": str(payload.get("phone", base.get("phone", "")) or "").strip(),
        "organisation": str(payload.get("organisation", base.get("organisation", "")) or "").strip(),
        "website": str(payload.get("website", base.get("website", "")) or "").strip(),
        "status": status,
        "notes": str(payload.get("notes", base.get("notes", "")) or "").strip(),
    }


def get_consultant_or_404(consultant_ref: str) -> dict[str, Any]:
    raw = run_psql(f"""
    SELECT COALESCE(row_to_json(row_data), '{{}}'::json)
    FROM (
        SELECT *
        FROM consultant_registry_consultants
        WHERE consultant_ref = {sql_text(consultant_ref)}
    ) row_data;
    """)
    row = json.loads(raw or "{}")
    if not row:
        raise HTTPException(status_code=404, detail=f"Consultant not found: {consultant_ref}")
    return row


def load_store() -> dict[str, Any]:
    ensure_database_shape()
    return {
        "providers": query_rows("providers", "name, id"),
        "products": query_rows("products", "name, id"),
        "primers": query_rows("primers", "title, id"),
        "test_runs": query_rows("test_runs", "run_date DESC, id"),
        "test_run_products": query_rows("test_run_products", "test_run_id, product_id"),
        "snapshots": query_rows("snapshots", "accepted_at DESC NULLS LAST, id"),
        "snapshot_pricing": query_rows("snapshot_pricing", "id"),
        "snapshot_facts": query_rows("snapshot_facts", "id"),
        "snapshot_list_items": query_rows("snapshot_list_items", "id"),
    }


def normalized_heading(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def extract_markdown_section(raw_markdown: str, section_name: str) -> str:
    if not raw_markdown:
        return ""

    target = normalized_heading(section_name)
    headings = list(re.finditer(r"(?m)^\s{0,3}#{2,6}\s+(?:\d+[.)]\s*)?(.+?)\s*$", raw_markdown))
    for index, match in enumerate(headings):
        heading = normalized_heading(match.group(1))
        if heading != target:
            continue

        start = match.end()
        end = headings[index + 1].start() if index + 1 < len(headings) else len(raw_markdown)
        return raw_markdown[start:end].strip()

    return ""


@app.get("/api/health")
def health() -> dict[str, str]:
    user = run_psql("SELECT current_user;")
    return {"status": "ok", "database": DB_NAME, "user": user}


@app.get("/api/store")
def get_store() -> dict[str, Any]:
    return load_store()


@app.get("/api/registry-matrix")
def get_registry_matrix() -> dict[str, Any]:
    store = load_store()
    products_by_provider: dict[str, list[dict[str, Any]]] = {}
    latest_snapshot_by_product: dict[str, dict[str, Any]] = {}
    pricing_by_snapshot: dict[str, list[dict[str, Any]]] = {}
    facts_by_snapshot: dict[str, list[dict[str, Any]]] = {}
    list_items_by_snapshot: dict[str, list[dict[str, Any]]] = {}

    for snapshot in store["snapshots"]:
        product_id = str(snapshot.get("product_id") or "")
        if product_id and product_id not in latest_snapshot_by_product:
            latest_snapshot_by_product[product_id] = snapshot

    for row in store["snapshot_pricing"]:
        pricing_by_snapshot.setdefault(str(row.get("snapshot_id") or ""), []).append({
            "field": row.get("field") or "",
            "value": row.get("value") or "",
        })

    for row in store["snapshot_facts"]:
        facts_by_snapshot.setdefault(str(row.get("snapshot_id") or ""), []).append({
            "section": row.get("section") or "",
            "capability": row.get("capability") or "",
            "available": row.get("available") or "",
            "note": row.get("note") or "",
            "review_flag": row.get("review_flag") or "",
        })

    for row in store["snapshot_list_items"]:
        list_items_by_snapshot.setdefault(str(row.get("snapshot_id") or ""), []).append({
            "list_type": row.get("list_type") or "",
            "name": row.get("name") or "",
            "type": row.get("type") or "",
            "purpose": row.get("purpose") or "",
            "access_or_status": row.get("access_or_status") or "",
            "note": row.get("note") or "",
        })

    for product in store["products"]:
        product_id = str(product.get("id") or "")
        enriched = dict(product)
        snapshot = latest_snapshot_by_product.get(product_id)
        if snapshot:
            snapshot_id = str(snapshot.get("id") or "")
            raw_markdown = str(snapshot.get("raw_markdown") or "")
            enriched["snapshot"] = {
                "id": snapshot_id,
                "snapshot_date": snapshot.get("snapshot_date") or "",
                "accepted_at": snapshot.get("accepted_at") or "",
                "parser_status": snapshot.get("parser_status") or "",
                "productSummary": extract_markdown_section(raw_markdown, "Product Summary"),
                "finalSnapshot": extract_markdown_section(raw_markdown, "Final Snapshot"),
                "pricing": pricing_by_snapshot.get(snapshot_id, []),
                "facts": facts_by_snapshot.get(snapshot_id, []),
                "listItems": list_items_by_snapshot.get(snapshot_id, []),
            }
        products_by_provider.setdefault(str(product.get("provider_id") or ""), []).append(enriched)

    providers = []
    for provider in store["providers"]:
        provider_id = str(provider.get("id") or "")
        providers.append({
            "id": provider_id,
            "name": provider.get("name") or "",
            "website": provider.get("website") or "",
            "logo_path": provider.get("logo_path") or "",
            "status": provider.get("status") or "Active",
            "products": products_by_provider.get(provider_id, []),
        })

    return {"providers": providers}


@app.get("/api/client-registry")
def get_client_registry() -> dict[str, Any]:
    ensure_database_shape()
    return {"clients": query_rows("client_registry_clients", "created_at DESC, client_record_ref DESC")}


@app.post("/api/client-registry/clients")
def create_client(payload: dict[str, Any]) -> JSONResponse:
    ensure_database_shape()
    client_ref = next_client_ref()
    client = clean_client_payload(payload)
    run_psql(f"""
    INSERT INTO client_registry_clients (
        client_record_ref,
        display_name,
        client_type,
        contact_name,
        email,
        phone,
        business_name,
        website,
        status,
        notes
    )
    VALUES (
        {sql_text(client_ref)},
        {sql_text(client["display_name"])},
        {sql_text(client["client_type"])},
        {sql_text(client["contact_name"])},
        {sql_text(client["email"])},
        {sql_text(client["phone"])},
        {sql_text(client["business_name"])},
        {sql_text(client["website"])},
        {sql_text(client["status"])},
        {sql_text(client["notes"])}
    );
    """)
    return JSONResponse({"status": "ok", "client": get_client_or_404(client_ref)})


@app.put("/api/client-registry/clients/{client_ref}")
def update_client(client_ref: str, payload: dict[str, Any]) -> JSONResponse:
    ensure_database_shape()
    existing = get_client_or_404(client_ref)
    client = clean_client_payload(payload, existing)
    run_psql(f"""
    UPDATE client_registry_clients
    SET
        display_name = {sql_text(client["display_name"])},
        client_type = {sql_text(client["client_type"])},
        contact_name = {sql_text(client["contact_name"])},
        email = {sql_text(client["email"])},
        phone = {sql_text(client["phone"])},
        business_name = {sql_text(client["business_name"])},
        website = {sql_text(client["website"])},
        status = {sql_text(client["status"])},
        notes = {sql_text(client["notes"])},
        updated_at = now()
    WHERE client_record_ref = {sql_text(client_ref)};
    """)
    return JSONResponse({"status": "ok", "client": get_client_or_404(client_ref)})


@app.get("/api/consultant-registry")
def get_consultant_registry() -> dict[str, Any]:
    ensure_database_shape()
    return {"consultants": query_rows("consultant_registry_consultants", "created_at DESC, consultant_ref DESC")}


@app.post("/api/consultant-registry/consultants")
def create_consultant(payload: dict[str, Any]) -> JSONResponse:
    ensure_database_shape()
    consultant_ref = next_consultant_ref()
    consultant = clean_consultant_payload(payload)
    run_psql(f"""
    INSERT INTO consultant_registry_consultants (
        consultant_ref,
        display_name,
        role,
        email,
        phone,
        organisation,
        website,
        status,
        notes
    )
    VALUES (
        {sql_text(consultant_ref)},
        {sql_text(consultant["display_name"])},
        {sql_text(consultant["role"])},
        {sql_text(consultant["email"])},
        {sql_text(consultant["phone"])},
        {sql_text(consultant["organisation"])},
        {sql_text(consultant["website"])},
        {sql_text(consultant["status"])},
        {sql_text(consultant["notes"])}
    );
    """)
    return JSONResponse({"status": "ok", "consultant": get_consultant_or_404(consultant_ref)})


@app.put("/api/consultant-registry/consultants/{consultant_ref}")
def update_consultant(consultant_ref: str, payload: dict[str, Any]) -> JSONResponse:
    ensure_database_shape()
    existing = get_consultant_or_404(consultant_ref)
    consultant = clean_consultant_payload(payload, existing)
    run_psql(f"""
    UPDATE consultant_registry_consultants
    SET
        display_name = {sql_text(consultant["display_name"])},
        role = {sql_text(consultant["role"])},
        email = {sql_text(consultant["email"])},
        phone = {sql_text(consultant["phone"])},
        organisation = {sql_text(consultant["organisation"])},
        website = {sql_text(consultant["website"])},
        status = {sql_text(consultant["status"])},
        notes = {sql_text(consultant["notes"])},
        updated_at = now()
    WHERE consultant_ref = {sql_text(consultant_ref)};
    """)
    return JSONResponse({"status": "ok", "consultant": get_consultant_or_404(consultant_ref)})


@app.put("/api/store")
def put_store(payload: dict[str, Any]) -> JSONResponse:
    store = {
        "providers": payload.get("providers") or [],
        "products": payload.get("products") or [],
        "primers": payload.get("primers") or [],
        "test_runs": payload.get("test_runs") or [],
        "test_run_products": payload.get("test_run_products") or [],
        "snapshots": payload.get("snapshots") or [],
        "snapshot_pricing": payload.get("snapshot_pricing") or [],
        "snapshot_facts": payload.get("snapshot_facts") or [],
        "snapshot_list_items": payload.get("snapshot_list_items") or [],
    }

    sql = f"""
    BEGIN;
    DELETE FROM snapshot_list_items;
    DELETE FROM snapshot_facts;
    DELETE FROM snapshot_pricing;
    DELETE FROM snapshots;
    DELETE FROM test_run_products;
    DELETE FROM test_runs;
    DELETE FROM primers;
    DELETE FROM products;
    DELETE FROM providers;

    INSERT INTO providers (id, name, website, logo_path, status)
    SELECT id, name, COALESCE(website, ''), COALESCE(logo_path, ''), COALESCE(status, 'Active')
    FROM jsonb_to_recordset({sql_json(store["providers"])}) AS x(id text, name text, website text, logo_path text, status text);

    INSERT INTO products (id, provider_id, name, website, logo_path, category, tags, status)
    SELECT id, provider_id, name, COALESCE(website, ''), COALESCE(logo_path, ''), COALESCE(category, ''), COALESCE(tags, ''), COALESCE(status, 'Active')
    FROM jsonb_to_recordset({sql_json(store["products"])}) AS x(id text, provider_id text, name text, website text, logo_path text, category text, tags text, status text);

    INSERT INTO primers (id, title, primer_text)
    SELECT id, title, COALESCE(primer_text, '')
    FROM jsonb_to_recordset({sql_json(store["primers"])}) AS x(id text, title text, primer_text text);

    INSERT INTO test_runs (id, run_date, primer_id)
    SELECT id, run_date::date, primer_id
    FROM jsonb_to_recordset({sql_json(store["test_runs"])}) AS x(id text, run_date text, primer_id text);

    INSERT INTO test_run_products (test_run_id, product_id)
    SELECT test_run_id, product_id
    FROM jsonb_to_recordset({sql_json(store["test_run_products"])}) AS x(test_run_id text, product_id text);

    INSERT INTO snapshots (id, product_id, snapshot_date, raw_markdown, parser_status, accepted_at)
    SELECT id, product_id, snapshot_date::date, COALESCE(raw_markdown, ''), COALESCE(parser_status, 'Accepted'), NULLIF(accepted_at, '')::timestamptz
    FROM jsonb_to_recordset({sql_json(store["snapshots"])}) AS x(id text, product_id text, snapshot_date text, raw_markdown text, parser_status text, accepted_at text);

    INSERT INTO snapshot_pricing (snapshot_id, field, value)
    SELECT snapshot_id, field, COALESCE(value, '')
    FROM jsonb_to_recordset({sql_json(store["snapshot_pricing"])}) AS x(snapshot_id text, field text, value text);

    INSERT INTO snapshot_facts (snapshot_id, section, capability, available, note, review_flag)
    SELECT snapshot_id, section, capability, COALESCE(available, 'UNKNOWN'), COALESCE(note, ''), COALESCE(review_flag, 'OK')
    FROM jsonb_to_recordset({sql_json(store["snapshot_facts"])}) AS x(snapshot_id text, section text, capability text, available text, note text, review_flag text);

    INSERT INTO snapshot_list_items (snapshot_id, list_type, name, type, purpose, access_or_status, note)
    SELECT snapshot_id, list_type, COALESCE(name, ''), COALESCE(type, ''), COALESCE(purpose, ''), COALESCE(access_or_status, ''), COALESCE(note, '')
    FROM jsonb_to_recordset({sql_json(store["snapshot_list_items"])}) AS x(snapshot_id text, list_type text, name text, type text, purpose text, access_or_status text, note text);

    COMMIT;
    """
    run_psql(sql)
    return JSONResponse({"status": "ok", "counts": {key: len(value) for key, value in store.items()}})


@app.post("/api/accept-snapshot")
def accept_snapshot(payload: dict[str, Any]) -> JSONResponse:
    snapshot = payload.get("snapshot") or {}
    pricing = payload.get("pricing") or []
    facts = payload.get("facts") or []
    list_items = payload.get("listItems") or []

    snapshot_id = str(snapshot.get("id") or "").strip()
    product_id = str(snapshot.get("product_id") or "").strip()
    snapshot_date = str(snapshot.get("snapshot_date") or "").strip()
    raw_markdown = str(snapshot.get("raw_markdown") or "")
    parser_status = str(snapshot.get("parser_status") or "Accepted")
    accepted_at = str(snapshot.get("accepted_at") or "")

    if not snapshot_id or not product_id or not snapshot_date:
        raise HTTPException(status_code=400, detail="Snapshot id, product id, and snapshot date are required")

    exists = run_psql(f"SELECT 1 FROM products WHERE id = {sql_text(product_id)} LIMIT 1;")
    if exists != "1":
        raise HTTPException(status_code=404, detail=f"Product not found: {product_id}")

    pricing_rows = [
        {
            "snapshot_id": snapshot_id,
            "field": str(row.get("field") or ""),
            "value": str(row.get("value") or ""),
        }
        for row in pricing
    ]
    fact_rows = [
        {
            "snapshot_id": snapshot_id,
            "section": str(row.get("section") or ""),
            "capability": str(row.get("capability") or ""),
            "available": str(row.get("available") or "UNKNOWN"),
            "note": str(row.get("note") or ""),
            "review_flag": str(row.get("review_flag") or "OK"),
        }
        for row in facts
    ]
    list_rows = [
        {
            "snapshot_id": snapshot_id,
            "list_type": str(row.get("list_type") or ""),
            "name": str(row.get("name") or ""),
            "type": str(row.get("type") or ""),
            "purpose": str(row.get("purpose") or ""),
            "access_or_status": str(row.get("access_or_status") or ""),
            "note": str(row.get("note") or ""),
        }
        for row in list_items
    ]

    sql = f"""
    BEGIN;
    DELETE FROM snapshots WHERE product_id = {sql_text(product_id)};

    INSERT INTO snapshots (id, product_id, snapshot_date, raw_markdown, parser_status, accepted_at)
    VALUES (
        {sql_text(snapshot_id)},
        {sql_text(product_id)},
        {sql_text(snapshot_date)}::date,
        {sql_text(raw_markdown)},
        {sql_text(parser_status)},
        NULLIF({sql_text(accepted_at)}, '')::timestamptz
    );

    INSERT INTO snapshot_pricing (snapshot_id, field, value)
    SELECT snapshot_id, field, COALESCE(value, '')
    FROM jsonb_to_recordset({sql_json(pricing_rows)}) AS x(snapshot_id text, field text, value text);

    INSERT INTO snapshot_facts (snapshot_id, section, capability, available, note, review_flag)
    SELECT snapshot_id, section, capability, COALESCE(available, 'UNKNOWN'), COALESCE(note, ''), COALESCE(review_flag, 'OK')
    FROM jsonb_to_recordset({sql_json(fact_rows)}) AS x(snapshot_id text, section text, capability text, available text, note text, review_flag text);

    INSERT INTO snapshot_list_items (snapshot_id, list_type, name, type, purpose, access_or_status, note)
    SELECT snapshot_id, list_type, COALESCE(name, ''), COALESCE(type, ''), COALESCE(purpose, ''), COALESCE(access_or_status, ''), COALESCE(note, '')
    FROM jsonb_to_recordset({sql_json(list_rows)}) AS x(snapshot_id text, list_type text, name text, type text, purpose text, access_or_status text, note text);
    COMMIT;
    """
    run_psql(sql)
    return JSONResponse({
        "status": "ok",
        "snapshotId": snapshot_id,
        "productId": product_id,
        "counts": {
            "pricing": len(pricing_rows),
            "facts": len(fact_rows),
            "listItems": len(list_rows),
        },
    })


@app.post("/api/upload-logo")
def upload_logo(payload: dict[str, Any]) -> dict[str, str]:
    filename = safe_filename(str(payload.get("filename") or "logo"))
    data_url = str(payload.get("dataUrl") or "")

    if not data_url.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Expected an image data URL")

    try:
        header, encoded = data_url.split(",", 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid data URL") from None

    mime = header.split(";", 1)[0].replace("data:", "")
    extension_by_mime = {
        "image/svg+xml": ".svg",
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    extension = extension_by_mime.get(mime)
    if not extension:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    raw = base64.b64decode(encoded)
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Logo image is larger than 2 MB")

    stem = safe_filename(Path(filename).stem)
    target_name = f"{stem}{extension}"
    target = LOGO_ROOT / target_name
    counter = 2
    while target.exists():
        target = LOGO_ROOT / f"{stem}-{counter}{extension}"
        counter += 1

    LOGO_ROOT.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    target.chmod(0o640)

    return {"path": f"/uploads/logos/{target.name}"}


@app.post("/api/backup")
def backup_database() -> dict[str, Any]:
    DB_BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_path = DB_BACKUP_ROOT / f"consultation_dash_{stamp}.dump"
    sql_path = DB_BACKUP_ROOT / f"consultation_dash_{stamp}_data.sql"

    run_command(["pg_dump", "-d", DB_NAME, "-Fc", "-f", str(dump_path)])
    run_command(["pg_dump", "-d", DB_NAME, "--data-only", "--inserts", "-f", str(sql_path)])

    return {
        "status": "ok",
        "dump": str(dump_path),
        "dataSql": str(sql_path),
        "dumpBytes": dump_path.stat().st_size,
        "dataSqlBytes": sql_path.stat().st_size,
    }


@app.get("/")
def index() -> FileResponse:
    return FileResponse(ROOT / "index.html")


@app.get("/app.js")
def app_js() -> FileResponse:
    return FileResponse(ROOT / "app.js", media_type="text/javascript")


@app.get("/styles.css")
def styles_css() -> FileResponse:
    return FileResponse(ROOT / "styles.css", media_type="text/css")


app.mount("/cdash_v1_core", StaticFiles(directory=ROOT), name="cdash")
app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")

visual_assets = PROJECT_ROOT / "visual_assets"
if visual_assets.is_dir():
    app.mount("/visual_assets", StaticFiles(directory=visual_assets), name="visual_assets")

UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")
