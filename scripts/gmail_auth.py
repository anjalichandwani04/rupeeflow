#!/usr/bin/env python3
"""
Gmail OAuth2 helper for installed apps (token.json + client secrets).

Self-healing: failed refresh (RefreshError or HTTP 400) deletes token.json and
re-runs the browser flow with offline access + consent so Google issues a
fresh refresh token.

Install (once):
  pip install google-auth google-auth-oauthlib google-auth-httplib2 requests

Place credentials.json (OAuth client) next to this script or set CREDENTIALS_PATH.
"""

from __future__ import annotations

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


def _run_installed_app_flow() -> Credentials:
    if not CREDENTIALS_PATH.is_file():
        raise FileNotFoundError(
            f"Missing {CREDENTIALS_PATH}. Download OAuth client JSON from Google Cloud Console."
        )
    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
    # Forces a new refresh token: offline access + consent screen every time.
    creds = flow.run_local_server(
        port=0,
        access_type="offline",
        prompt="consent",
    )
    TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
    return creds


def get_credentials() -> Credentials:
    """
    Load token.json if it exists; refresh when expired; on RefreshError or any
    HTTP 400 during refresh, delete token.json and run InstalledAppFlow again.
    """
    creds: Credentials | None = None
    token_file = str(TOKEN_PATH)

    if os.path.isfile(token_file):
        try:
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)
        except (ValueError, KeyError, OSError):
            print("token.json was unreadable. Re-authenticating...")
            _remove_token_file()
            creds = None

    if creds and creds.valid:
        return creds

    if creds and creds.expired and not creds.refresh_token:
        print("Stored token expired without a refresh token. Re-authenticating...")
        _remove_token_file()
        creds = None

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
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
