"""
UniMall Backend — Database Manager (backend/db.py)
Unified PostgreSQL (Neon Lakebase) and SQLite connection, transaction helpers, and query translation.
"""

import os
import sqlite3
from contextlib import contextmanager

# Try loading environment variables from .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None

DATABASE_URL = os.getenv('DATABASE_URL')
DB_PATH = os.path.join(os.path.dirname(__file__), 'unimall.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')

def is_postgres():
    url = os.getenv('DATABASE_URL')
    return bool(psycopg2 and url and (url.startswith('postgres://') or url.startswith('postgresql://')))


def _translate_query(query):
    """Converts SQLite '?' parameter placeholders to PostgreSQL '%s'."""
    if is_postgres():
        return query.replace('?', '%s')
    return query


def get_connection():
    """Create and configure a database connection (Neon Postgres or SQLite)."""
    if is_postgres():
        try:
            db_url = os.getenv('DATABASE_URL')
            conn = psycopg2.connect(db_url)
            return conn
        except Exception as e:
            print(f"[db.py] Warning: Postgres connection failed ({e}), falling back to SQLite.")

    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db():
    """Initialize the database schema from schema.sql if using SQLite."""
    if not is_postgres():
        with open(SCHEMA_PATH, 'r') as f:
            schema_sql = f.read()

        conn = get_connection()
        try:
            conn.executescript(schema_sql)
            conn.commit()
        finally:
            conn.close()


@contextmanager
def transaction(immediate=True):
    """Context manager for database transactions."""
    conn = get_connection()
    try:
        if not is_postgres():
            if immediate:
                conn.execute("BEGIN IMMEDIATE")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query_all(query, args=(), conn=None):
    """Execute a SELECT query and return list of dicts."""
    close_after = False
    if conn is None:
        conn = get_connection()
        close_after = True
    try:
        translated_q = _translate_query(query)
        if is_postgres() and hasattr(conn, 'cursor') and not isinstance(conn, sqlite3.Connection):
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(translated_q, args)
                rows = cur.fetchall()
                return [dict(row) for row in rows]
        else:
            cursor = conn.execute(query, args)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    finally:
        if close_after:
            conn.close()


def query_one(query, args=(), conn=None):
    """Execute a SELECT query and return a single dict, or None."""
    close_after = False
    if conn is None:
        conn = get_connection()
        close_after = True
    try:
        translated_q = _translate_query(query)
        if is_postgres() and hasattr(conn, 'cursor') and not isinstance(conn, sqlite3.Connection):
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(translated_q, args)
                row = cur.fetchone()
                return dict(row) if row else None
        else:
            cursor = conn.execute(query, args)
            row = cursor.fetchone()
            return dict(row) if row else None
    finally:
        if close_after:
            conn.close()


def execute_mutation(query, args=(), conn=None):
    """Execute an INSERT, UPDATE, or DELETE query and commit."""
    close_after = False
    if conn is None:
        conn = get_connection()
        close_after = True
    try:
        translated_q = _translate_query(query)
        if is_postgres() and hasattr(conn, 'cursor') and not isinstance(conn, sqlite3.Connection):
            with conn.cursor() as cur:
                cur.execute(translated_q, args)
                if close_after:
                    conn.commit()
                return cur.rowcount
        else:
            cursor = conn.execute(query, args)
            if close_after:
                conn.commit()
            return cursor.lastrowid
    finally:
        if close_after:
            conn.close()
