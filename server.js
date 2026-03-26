import express from "express";
import session from "express-session";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
  secret: "cryptotrack-secret-2025",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 }
}));

// Demo users
const USERS = [
  { username: "rose", password: "rose123", name: "Rose Lobo", role: "Student" },
  { username: "admin", password: "admin123", name: "Admin User", role: "Admin" }
];

const COINS = [
  { label: "Bitcoin",  symbol: "BTC-USD", icon: "₿", color: "#f7931a", bg: "#fff8ee", id: "bitcoin" },
  { label: "Ethereum", symbol: "ETH-USD", icon: "Ξ", color: "#627eea", bg: "#eef0ff", id: "ethereum" },
  { label: "Solana",   symbol: "SOL-USD", icon: "◎", color: "#9945ff", bg: "#f5eeff", id: "solana" },
  { label: "Cardano",  symbol: "ADA-USD", icon: "₳", color: "#0033ad", bg: "#eef2ff", id: "cardano" },
  { label: "Dogecoin", symbol: "DOGE-USD",icon: "Ð", color: "#c2a633", bg: "#fffbee", id: "dogecoin" },
  { label: "Litecoin", symbol: "LTC-USD", icon: "Ł", color: "#345d9d", bg: "#eef3ff", id: "litecoin" },
];

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// ── ROUTES ──

// Login
app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/markets");
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.render("login", { error: "Invalid username or password." });
  req.session.user = user;
  res.redirect("/markets");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Home → redirect to markets
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/markets");
  res.redirect("/login");
});

// Markets page
app.get("/markets", requireLogin, async (req, res) => {
  try {
    const prices = {};
    await Promise.allSettled(
      COINS.map(async (c) => {
        try {
          const r = await axios.get(`https://api.blockchain.com/v3/exchange/tickers/${c.symbol}`);
          prices[c.symbol] = r.data;
        } catch { prices[c.symbol] = null; }
      })
    );
    res.render("markets", { user: req.session.user, coins: COINS, prices });
  } catch (err) {
    res.render("markets", { user: req.session.user, coins: COINS, prices: {} });
  }
});

// Coin detail page
app.get("/coin/:symbol", requireLogin, async (req, res) => {
  const symbolParam = req.params.symbol.toUpperCase();
  const coin = COINS.find(c => c.symbol === `${symbolParam}-USD` || c.symbol === symbolParam);
  if (!coin) return res.redirect("/markets");
  try {
    const r = await axios.get(`https://api.blockchain.com/v3/exchange/tickers/${coin.symbol}`);
    res.render("coin", { user: req.session.user, coin, data: r.data, coins: COINS });
  } catch (err) {
    res.render("coin", { user: req.session.user, coin, data: null, coins: COINS });
  }
});

// Trading page
app.get("/trade", requireLogin, (req, res) => {
  res.render("trade", { user: req.session.user, coins: COINS, success: null, error: null });
});

app.post("/trade", requireLogin, async (req, res) => {
  const { symbol, type, amount } = req.body;
  const coin = COINS.find(c => c.symbol === symbol);
  try {
    const r = await axios.get(`https://api.blockchain.com/v3/exchange/tickers/${symbol}`);
    const price = parseFloat(r.data.last_trade_price || r.data.price_24h || 0);
    const total = (parseFloat(amount) * price).toFixed(2);
    res.render("trade", {
      user: req.session.user, coins: COINS,
      success: { coin, type, amount, price: price.toFixed(2), total },
      error: null
    });
  } catch {
    res.render("trade", { user: req.session.user, coins: COINS, success: null, error: "Trade failed. Try again." });
  }
});

app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   CRYPTOTRACK · EXP 4B LAB          ║");
  console.log(`║   http://localhost:${PORT}              ║`);
  console.log("║   Login: rose / rose123              ║");
  console.log("╚══════════════════════════════════════╝\n");
});
