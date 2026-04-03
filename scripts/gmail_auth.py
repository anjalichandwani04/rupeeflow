#!/usr/bin/env python3
"""
Gmail OAuth2 helper for installed apps (token.json + client secrets).

Install (once):
  pip install google-auth google-auth-oauthlib google-auth-httplib2

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


def get_credentials() -> Credentials:
    """
    Load token.json, refresh if needed, or run browser flow.
    On RefreshError: delete invalid token.json and re-authenticate.
    """
    creds: Credentials | None = None

    if TOKEN_PATH.is_file():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
        except RefreshError:
            print("Old token was invalid. Re-authenticating...")
            try:
                TOKEN_PATH.unlink()
            except OSError:
                pass
            creds = None

    if not creds:
        if not CREDENTIALS_PATH.is_file():
            raise FileNotFoundError(
                f"Missing {CREDENTIALS_PATH}. Download OAuth client JSON from Google Cloud Console."
            )
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
        creds = flow.run_local_server(port=0)
        TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")

    return creds


def authenticate_gmail() -> Credentials:
    """Alias for get_credentials()."""
    return get_credentials()


if __name__ == "__main__":
    get_credentials()
    print("Credentials OK — token saved to", TOKEN_PATH)
