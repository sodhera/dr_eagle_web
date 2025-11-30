const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5011;
const ROOT = __dirname;

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers });
  res.end(body ?? "");
}

function serveStatic(req, res) {
  const urlPath = req.url.split("?")[0];
  const targetPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(ROOT, targetPath.replace(/^\//, ""));
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, "Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") return send(res, 404, "Not found");
      return send(res, 500, "Server error");
    }
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === ".html"
        ? "text/html"
        : ext === ".js"
        ? "application/javascript"
        : ext === ".css"
        ? "text/css"
        : "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(data);
  });
}

function handleClientLog(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    try {
      const parsed = body ? JSON.parse(body) : null;
      console.log("[CLIENT]", JSON.stringify(parsed));
    } catch (err) {
      console.log("[CLIENT] raw:", body);
    }
    send(res, 204, "");
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.startsWith("/client-log")) {
    return handleClientLog(req, res);
  }
  if (req.method === "GET" || req.method === "HEAD") {
    return serveStatic(req, res);
  }
  send(res, 405, "Method not allowed");
});

server.listen(PORT, () => {
  console.log(`Local MCP harness listening on http://localhost:${PORT}`);
});
