import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega .env local (simula as Environment Variables da Vercel)
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8")
        .split("\n")
        .forEach((line) => {
            const [key, ...val] = line.split("=");
            if (key && key.trim() && !key.startsWith("#")) {
                process.env[key.trim()] = val.join("=").trim().replace(/^["']|["']$/g, "");
            }
        });
    console.log("📄 .env carregado com sucesso.");
}
const PORT = 3001;

// Mime types for static files
const MIME = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
};

// Simulate req.body parsing for JSON
async function getBody(req) {
    return new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
            try {
                // Handle multipart/form-data (just resolve empty for now)
                const ct = req.headers["content-type"] || "";
                if (ct.includes("application/json")) {
                    resolve(JSON.parse(data));
                } else {
                    resolve({});
                }
            } catch {
                resolve({});
            }
        });
    });
}

// Mock res object compatible with Vercel handler signature
function makeRes(res) {
    const obj = {
        _status: 200,
        _headers: {},
        status(code) {
            this._status = code;
            return this;
        },
        setHeader(key, val) {
            this._headers[key] = val;
            return this;
        },
        json(data) {
            res.writeHead(this._status, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                ...this._headers,
            });
            res.end(JSON.stringify(data));
        },
    };
    return obj;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // CORS preflight
    if (req.method === "OPTIONS") {
        res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" });
        res.end();
        return;
    }

    // API routes
    if (pathname.startsWith("/api/")) {
        const handlerName = pathname.replace("/api/", "").split("/")[0];
        const handlerPath = path.join(__dirname, "api", `${handlerName}.js`);

        if (fs.existsSync(handlerPath)) {
            try {
                // Dynamic import of handler (cache-bust with timestamp)
                const mod = await import(`file:///${handlerPath}?t=${Date.now()}`);
                const handler = mod.default;
                const rawBody = mod.config?.api?.bodyParser === false;
                // Se bodyParser: false, passa o req original (stream) para o handler
                const mockReq = rawBody
                    ? req
                    : { method: req.method, headers: req.headers, body: await getBody(req), url: pathname };
                const mockRes = makeRes(res);
                await handler(mockReq, mockRes);
            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "API route not found" }));
        }
        return;
    }

    // Static files
    let filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, "index.html"); // SPA fallback
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || "text/plain";

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n✅ Servidor rodando em http://localhost:${PORT}\n`);
    console.log("   Pressione Ctrl+C para parar.\n");
});
