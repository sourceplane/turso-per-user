#!/usr/bin/env python3
"""A local stand-in for Turso's Platform API: what the site asks of it.

    stand-in.py <port-file> <log-file>

Listens on a free 127.0.0.1 port (written to <port-file> once it is
listening) and answers the two calls the site makes, as the API would —
POST /v1/organizations/<org>/databases creates a database (and remembers
it), GET /v1/organizations/<org>/databases/<name> looks one up (404 until
it was created) — appending every request it is sent to <log-file> as one
JSON line: method, path, the authorization header, and the body as JSON.
The e2e tier points the Worker at it (TURSO_API_BASE_URL) and reads the log:
what reaches Turso is the template's own request. Nothing here talks to the
network.
"""
import json
import re
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

port_file, log_file = sys.argv[1], sys.argv[2]
created = set()
DB = re.compile(r"^/v1/organizations/([^/]+)/databases(?:/([^/]+))?$")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _log(self, method, body):
        entry = {"method": method, "path": self.path,
                 "authorization": self.headers.get("authorization"), "body": body}
        with open(log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def _database(self, org, name):
        return {"database": {"Name": name, "DbId": str(uuid.uuid4()),
                             "Hostname": f"{name}-{org}.turso.io", "group": "default"}}

    def do_GET(self):
        self._log("GET", None)
        m = DB.match(self.path)
        if m and m.group(2):
            if m.group(2) in created:
                return self._send(200, self._database(m.group(1), m.group(2)))
            return self._send(404, {"error": f"database {m.group(2)} not found"})
        self._send(404, {"error": f"no route {self.path}"})

    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("content-length") or 0))
        try:
            body = json.loads(raw or b"null")
        except ValueError:
            body = {"unparsed": raw.decode(errors="replace")}
        self._log("POST", body)
        m = DB.match(self.path)
        if m and not m.group(2) and isinstance(body, dict) and body.get("name"):
            created.add(body["name"])
            return self._send(200, self._database(m.group(1), body["name"]))
        self._send(404, {"error": f"no route {self.path}"})


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
with open(port_file, "w") as f:
    f.write(str(server.server_address[1]))
server.serve_forever()
