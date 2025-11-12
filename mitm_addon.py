#!/usr/bin/env python3
"""
MITM Proxy Addon for VS Code Network Interceptor
This addon intercepts requests and blocks those matching blacklist patterns.
"""

import re
import sys
import json
from mitmproxy import http, ctx
from pathlib import Path
from typing import List, Dict, Any


class BlacklistPattern:
    """Represents a single blacklist pattern"""

    def __init__(self, pattern_type: str, value: str, description: str = ""):
        self.type = pattern_type
        self.value = value
        self.description = description
        self.regex = None

        # Pre-compile regex patterns for performance
        if self.type == "regex":
            try:
                self.regex = re.compile(value)
            except re.error as e:
                ctx.log.error(f"Invalid regex pattern '{value}': {e}")

    def matches(self, url: str, host: str) -> bool:
        """Check if this pattern matches the given URL"""
        if self.type == "exact":
            return url == self.value
        elif self.type == "domain":
            return host == self.value or host.endswith(f".{self.value}")
        elif self.type == "path":
            return self.value in url
        elif self.type == "regex" and self.regex:
            return bool(self.regex.search(url))
        return False


class NetworkInterceptor:
    """Main addon class for network interception"""

    def __init__(self):
        self.patterns: List[BlacklistPattern] = []
        self.config_path: str = ""
        self.response_status: int = 204
        self.response_body: str = ""
        self.log_blocked: bool = True
        self.stats = {
            "blocked": 0,
            "allowed": 0
        }

    def load(self, loader):
        """Called when addon is loaded"""
        loader.add_option(
            name="blacklist_config",
            typespec=str,
            default="",
            help="Path to blacklist configuration file"
        )
        loader.add_option(
            name="response_status",
            typespec=int,
            default=204,
            help="HTTP status code for blocked requests"
        )
        loader.add_option(
            name="response_body",
            typespec=str,
            default="",
            help="Response body for blocked requests"
        )
        loader.add_option(
            name="log_blocked",
            typespec=bool,
            default=True,
            help="Log blocked requests"
        )

    def configure(self, updates):
        """Called when configuration changes"""
        if "blacklist_config" in updates:
            self.config_path = ctx.options.blacklist_config
            self.load_blacklist()

        if "response_status" in updates:
            self.response_status = ctx.options.response_status

        if "response_body" in updates:
            self.response_body = ctx.options.response_body

        if "log_blocked" in updates:
            self.log_blocked = ctx.options.log_blocked

    def load_blacklist(self):
        """Load blacklist patterns from configuration file (JSON format)"""
        if not self.config_path:
            ctx.log.warn("No blacklist config path specified")
            return

        try:
            config_file = Path(self.config_path)
            if not config_file.exists():
                ctx.log.error(f"Blacklist config file not found: {self.config_path}")
                return

            with open(config_file, 'r') as f:
                config = json.load(f)

            self.patterns = []
            patterns_data = config.get('patterns', [])

            for pattern_data in patterns_data:
                pattern = BlacklistPattern(
                    pattern_type=pattern_data.get('type', 'exact'),
                    value=pattern_data.get('value', ''),
                    description=pattern_data.get('description', '')
                )
                self.patterns.append(pattern)

            ctx.log.info(f"Loaded {len(self.patterns)} blacklist patterns from {self.config_path}")

        except Exception as e:
            ctx.log.error(f"Error loading blacklist config: {e}")

    def is_blacklisted(self, url: str, host: str) -> tuple[bool, str]:
        """
        Check if URL matches any blacklist pattern
        Returns: (is_blocked, reason)
        """
        for pattern in self.patterns:
            if pattern.matches(url, host):
                reason = pattern.description or f"{pattern.type}: {pattern.value}"
                return True, reason
        return False, ""

    def request(self, flow: http.HTTPFlow) -> None:
        """
        Called for each HTTP request
        This is where we intercept and block requests
        """
        url = flow.request.pretty_url
        host = flow.request.host

        is_blocked, reason = self.is_blacklisted(url, host)

        if is_blocked:
            self.stats["blocked"] += 1

            if self.log_blocked:
                ctx.log.info(f"[BLOCKED] {flow.request.method} {url}")
                ctx.log.info(f"  Reason: {reason}")

            # Create response without making actual request
            flow.response = http.Response.make(
                status_code=self.response_status,
                content=self.response_body.encode() if self.response_body else b"",
                headers={
                    "Content-Type": "application/json" if self.response_body else "text/plain",
                    "X-MITM-Blocked": "true",
                    "X-MITM-Reason": reason
                }
            )
        else:
            self.stats["allowed"] += 1

    def done(self):
        """Called when addon is unloaded"""
        ctx.log.info(f"Network Interceptor Stats:")
        ctx.log.info(f"  Blocked: {self.stats['blocked']}")
        ctx.log.info(f"  Allowed: {self.stats['allowed']}")


# Create addon instance
addons = [NetworkInterceptor()]
