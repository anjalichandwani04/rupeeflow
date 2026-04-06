#!/usr/bin/env python3
"""
Gmail OAuth2 helper for installed apps (token.json + client secrets).

Token sources (first match wins):
  1. scripts/token.json on disk
  2. GMAIL_TOKEN env var (JSON string, parsed with json.loads)

Client secrets for the browser flow (first match wins):
  1. scripts/credentials.json on disk
  2. GMAIL_CREDENTIALS env var (JSON string, parsed with json.loads)

Self-healing: failed refresh (RefreshError or HTTP 400) deletes token.json and
re-runs the browser flow with offline access + consent so Google issues a
fresh refresh token. (Env-provided tokens are cleared in-memory only; update
the env value if it stays invalid.)

Install (once):
  pip install google-auth google-auth-oauthlib google-auth-httplib2 requests
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# Adjust paths and scopes to match your project.
SCRIPT_DIR = Path(__file__).resolve().parent
TOKEN_PATH = SCRIPT_DIR / "token.json"
CREDENTIALS_PATH = SCRIPT_DIR / "credentials.json"

# Gmail read scope example; add scopes you need.
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def _remove_token_file() -> None:
    """Delete token.json if present (uses os.remove as requested)."""
    path = str(TOKEN_PATH)
    if os.path.isfile(path):
        try:
            os.remove(path)
        except OSError:
            pass


def _is_http_400_error(exc: BaseException) -> bool:
    """True if this exception (or its cause chain) carries an HTTP 400 response."""
    seen: set[int] = set()
    cur: BaseException | None = exc
    while cur is not None and id(cur) not in seen:
        seen.add(id(cur))
        resp = getattr(cur, "response", None)
        if resp is not None and getattr(resp, "status_code", None) == 400:
            return True
        cur = getattr(cur, "__cause__", None) or getattr(cur, "__context__", None)
    return False


def _load_credentials_from_token_source() -> Credentials | None:
    """
    Prefer token.json; if missing, use GMAIL_TOKEN (JSON string via json.loads).
    """
    token_file = str(TOKEN_PATH)
    if os.path.isfile(token_file):
        try:
            return Credentials.from_authorized_user_file(token_file, SCOPES)
        except (ValueError, KeyError, OSError):
            print("token.json was unreadable. Re-authenticating...")
            _remove_token_file()
            return None

    raw = os.environ.get("GMAIL_TOKEN")
    if raw is not None and str(raw).strip():
        try:
            info = json.loads(raw)
            if not isinstance(info, dict):
                raise TypeError("expected a JSON object")
            return Credentials.from_authorized_user_info(info, SCOPES)
        except (json.JSONDecodeError, TypeError, ValueError, KeyError) as e:
            print(f"GMAIL_TOKEN env JSON was invalid ({e}). Re-authenticating...")
            return None

    return None


def _load_client_config_dict() -> dict:
    """
    Load OAuth client JSON from credentials.json or GMAIL_CREDENTIALS (json.loads).
    """
    if CREDENTIALS_PATH.is_file():
        with open(CREDENTIALS_PATH, encoding="utf-8") as f:
            return json.load(f)

    raw = os.environ.get("GMAIL_CREDENTIALS")
    if raw is not None and str(raw).strip():
        try:
            config = json.loads(raw)
            if not isinstance(config, dict):
                raise TypeError("expected a JSON object")
            return config
        except json.JSONDecodeError as e:
            raise ValueError(f"GMAIL_CREDENTIALS is not valid JSON: {e}") from e

    raise FileNotFoundError(
        "Missing OAuth client config: add scripts/credentials.json or set "
        "GMAIL_CREDENTIALS to the downloaded client JSON string."
    )


def _persist_token(creds: Credentials) -> None:
    """Write refreshed / new credentials to token.json when possible."""
    TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")


def _run_installed_app_flow() -> Credentials:
    client_config = _load_client_config_dict()
    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    creds = flow.run_local_server(
        port=0,
        access_type="offline",
        prompt="consent",
    )
    _persist_token(creds)
    return creds


def get_credentials() -> Credentials:
    """
    Load token from token.json or GMAIL_TOKEN; refresh when expired; on failure
    delete token.json (if any) and run InstalledAppFlow using file or
    GMAIL_CREDENTIALS.
    """
    creds = _load_credentials_from_token_source()

    if creds and creds.valid:
        return creds

    if creds and creds.expired and not creds.refresh_token:
        print("Stored token expired without a refresh token. Re-authenticating...")
        _remove_token_file()
        creds = None

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            _persist_token(creds)
        except RefreshError:
            print("Old token was invalid. Re-authenticating...")
            _remove_token_file()
            creds = None
        except Exception as e:
            if _is_http_400_error(e):
                print("Old token was invalid (HTTP 400). Re-authenticating...")
                _remove_token_file()
                creds = None
            else:
                raise

    if not creds:
        creds = _run_installed_app_flow()

    return creds


def authenticate_gmail() -> Credentials:
    """Alias for get_credentials()."""
    return get_credentials()


if __name__ == "__main__":
    get_credentials()
    print("Credentials OK — token saved to", TOKEN_PATH)
