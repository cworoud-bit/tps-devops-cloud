const express = require("express");
const { execFile } = require("child_process");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const config = require("./config");

if (!config.jwt_secret) {
  console.error("JWT_SECRET manquant");
  process.exit(1);
}

const app = express();
app.use(express.json());

const db = new sqlite3.Database(":memory:");
db.serialize(() => {
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role TEXT)");
  db.run("INSERT INTO users (name, role) VALUES ('alice', 'admin'), ('bob', 'user')");
});

// Requête paramétrée : la valeur n'est plus concaténée dans le SQL.
app.get("/users", (req, res) => {
  const name = String(req.query.name || "");
  db.all("SELECT id, name FROM users WHERE name = ?", [name], (err, rows) =>
    err ? res.status(500).json({ error: "erreur interne" }) : res.json(rows)
  );
});

// execFile (pas de shell) + validation stricte du host.
app.get("/ping", (req, res) => {
  const host = String(req.query.host || "");
  if (!/^[a-zA-Z0-9.-]{1,253}$/.test(host)) {
    return res.status(400).json({ error: "host invalide" });
  }
  execFile("ping", ["-c", "1", host], (err, stdout) =>
    res.type("text").send(stdout || "ping échoué")
  );
});

// Réponse JSON : plus de HTML construit avec l'entrée utilisateur.
app.get("/hello", (req, res) => {
  res.json({ message: "Bonjour " + String(req.query.name || "") });
});

// Fonctionne mais dépend d'un lodash à jour (voir partie 4).
app.post("/settings", (req, res) => {
  const settings = _.merge({}, req.body);
  res.json(settings);
});

// Secret depuis l'environnement + expiration du jeton.
app.post("/login", (req, res) => {
  const token = jwt.sign(
    { user: req.body.user, role: "user" },
    config.jwt_secret,
    { expiresIn: "1h" }
  );
  res.json({ token });
});

app.listen(config.port, () => console.log(`vuln-app écoute sur ${config.port}`));
