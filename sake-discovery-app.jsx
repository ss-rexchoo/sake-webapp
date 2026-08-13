import { useState } from "react";
import { MapPin, Search, ArrowLeft, Compass, Wine } from "lucide-react";

const SAKE = [
  { id: 1, name: "Hakkaisan", jp: "八海山", brewery: "Hakkaisan Brewery", region: "chubu", prefecture: "Niigata", sweetness: 15, body: 22, category: "Junmai Ginjo", tags: ["Sashimi", "Seafood", "Beginner friendly"], desc: "Clean, dry, and crisp — the archetype of Niigata's tanrei-karakuchi style.", fridge: 27 },
  { id: 2, name: "Kubota Senju", jp: "久保田 千寿", brewery: "Asahi Shuzo", region: "chubu", prefecture: "Niigata", sweetness: 22, body: 30, category: "Ginjo", tags: ["Sushi", "Light appetizers"], desc: "Soft and elegant, with gentle rice sweetness balanced by a dry finish.", fridge: 14 },
  { id: 3, name: "Juyondai", jp: "十四代", brewery: "Takagi Shuzo", region: "tohoku", prefecture: "Yamagata", sweetness: 68, body: 55, category: "Junmai Daiginjo", tags: ["Cheese", "Fruit", "Special occasion"], desc: "Lush and fruity, famously hard to find — a modern classic.", fridge: 31 },
  { id: 4, name: "Tatenokawa 18", jp: "楯野川 純米大吟醸18", brewery: "Tatenokawa", region: "tohoku", prefecture: "Yamagata", sweetness: 40, body: 35, category: "Junmai Daiginjo", tags: ["Delicate fish", "White meat"], desc: "Polished to 18%, delicate and fragrant with a silky texture.", fridge: 22 },
  { id: 5, name: "Kikumasamune", jp: "菊正宗", brewery: "Kikumasamune", region: "kansai", prefecture: "Hyogo", sweetness: 25, body: 62, category: "Honjozo", tags: ["Grilled meat", "Umami dishes"], desc: "A traditional Nada-style sake, full-bodied with deep umami.", fridge: 5 },
  { id: 6, name: "Gekkeikan", jp: "月桂冠", brewery: "Gekkeikan", region: "kansai", prefecture: "Kyoto", sweetness: 46, body: 44, category: "Junmai", tags: ["Everyday food", "Warm sake"], desc: "A soft, approachable Fushimi-style sake, lovely served warm.", fridge: 11 },
  { id: 7, name: "Dassai 45", jp: "獺祭 45", brewery: "Asahi Shuzo (Yamaguchi)", region: "chugoku", prefecture: "Yamaguchi", sweetness: 55, body: 38, category: "Junmai Daiginjo", tags: ["Tempura", "Light dishes"], desc: "Bright and fruity, polished to 45% — approachable and aromatic.", fridge: 8 },
  { id: 8, name: "Kamotsuru", jp: "賀茂鶴", brewery: "Kamotsuru Shuzo", region: "chugoku", prefecture: "Hiroshima", sweetness: 35, body: 50, category: "Junmai", tags: ["Grilled fish", "Oysters"], desc: "Soft Hiroshima water gives this sake a smooth, rounded body.", fridge: 19 },
  { id: 9, name: "Nabeshima", jp: "鍋島", brewery: "Fukuchiyo Shuzo", region: "kyushu", prefecture: "Saga", sweetness: 50, body: 48, category: "Junmai Ginjo", tags: ["Grilled dishes", "Vegetables"], desc: "Award-winning Saga sake with balanced sweetness and clean acidity.", fridge: 17 },
  { id: 10, name: "Tenzan", jp: "天山", brewery: "Tenzan Shuzo", region: "kyushu", prefecture: "Saga", sweetness: 32, body: 58, category: "Junmai", tags: ["Nabe hotpot", "Robust dishes"], desc: "Full-bodied and warming — built to stand up to hearty cooking.", fridge: 24 },
  { id: 11, name: "Otokoyama", jp: "男山", brewery: "Otokoyama Brewery", region: "hokkaido", prefecture: "Hokkaido", sweetness: 20, body: 34, category: "Junmai Ginjo", tags: ["Crab", "Cold dishes"], desc: "Brewed with pristine Daisetsuzan snowmelt — clean and refreshing.", fridge: 33 },
  { id: 12, name: "Kunimare", jp: "国稀", brewery: "Kunimare Shuzo", region: "hokkaido", prefecture: "Hokkaido", sweetness: 58, body: 28, category: "Ginjo", tags: ["Light appetizers", "Aperitif"], desc: "Japan's northernmost brewery — light, gently sweet, easy drinking.", fridge: 29 },
];

const REGIONS = [
  { id: "hokkaido", name: "Hokkaido", jp: "北海道", cx: 195, cy: 55, rx: 50, ry: 34, rot: -6, desc: "Cold winters and mountain snowmelt make for clean, refreshing sake." },
  { id: "tohoku", name: "Tohoku", jp: "東北", cx: 168, cy: 142, rx: 56, ry: 50, rot: -4, desc: "Heavy snowfall country, famous for fruity, award-winning sake." },
  { id: "chubu", name: "Chubu", jp: "中部・新潟", cx: 138, cy: 236, rx: 58, ry: 46, rot: -8, desc: "Home of Niigata, birthplace of clean, dry tanrei-karakuchi sake." },
  { id: "kansai", name: "Kansai", jp: "関西", cx: 116, cy: 322, rx: 52, ry: 44, rot: -5, desc: "Historic brewing heartland around Kyoto and Hyogo." },
  { id: "chugoku", name: "Chugoku", jp: "中国", cx: 90, cy: 400, rx: 48, ry: 38, rot: -6, desc: "Home of Dassai and the polished, fruity ginjo style." },
  { id: "kyushu", name: "Kyushu", jp: "九州", cx: 68, cy: 466, rx: 46, ry: 34, rot: -4, desc: "A warmer climate producing bold, umami-rich sake." },
];

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function describeTaste(x, y) {
  const sw = x < 38 ? "dry" : x > 62 ? "sweet" : "balanced";
  const bd = y < 38 ? "light" : y > 62 ? "full-bodied" : "medium-bodied";
  return sw + " & " + bd;
}

export default function SakeDiscoveryApp() {
  const [history, setHistory] = useState(["landing"]);
  const screen = history[history.length - 1];
  const [taste, setTaste] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const [activeRegion, setActiveRegion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState(false);

  function go(next) {
    setHistory((h) => [...h, next]);
  }
  function back() {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }
  function openDetail(sake) {
    setSelected(sake);
    go("detail");
  }
  function updatePad(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const yRaw = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setTaste({ x, y: 100 - yRaw });
  }
  function revealMatches() {
    setRevealed(false);
    go("reveal");
    setTimeout(() => setRevealed(true), 1250);
  }

  const matches = SAKE.map((s) => {
    const d = dist(taste.x, taste.y, s.sweetness, s.body);
    return { ...s, match: Math.max(1, Math.round(100 - (d / 141.42) * 100)) };
  })
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);

  const regionSake = activeRegion ? SAKE.filter((s) => s.region === activeRegion.id) : [];
  const searchResults = query.trim()
    ? SAKE.filter((s) => (s.name + s.brewery + s.prefecture).toLowerCase().includes(query.toLowerCase()))
    : SAKE;

  return (
    <div className="sake-app">
      <style>{`
        .sake-app {
          --bg: #16233d; --bg2: #1d3155; --cream: #f4ecd8; --ink: #241f1a;
          --vermillion: #c0392b; --vermillion-dark: #8f2a1f; --gold: #cfa752; --gold-light: #e9d29a;
          --muted: #9aa7bd; --font-display: 'Shippori Mincho', Georgia, serif;
          --font-body: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', system-ui, sans-serif;
          position: relative; min-height: 640px; background: radial-gradient(circle at 30% 0%, var(--bg2), var(--bg) 70%);
          color: var(--cream); font-family: var(--font-body); border-radius: 20px; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3); padding-bottom: 8px;
        }
        .sake-app * { box-sizing: border-box; }
        .screen { padding: 20px 20px 28px; animation: fadeSlideUp 0.45s ease both; min-height: 560px; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(207,167,82,0.55);} 50% { box-shadow: 0 0 26px 8px rgba(207,167,82,0.45);} }
        @keyframes shimmer { 0% { transform: translateY(-120%);} 100% { transform: translateY(220%);} }
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px);} to { opacity: 1; transform: translateY(0);} }
        .back-btn { position: absolute; top: 16px; left: 16px; z-index: 5; display: flex; align-items: center; gap: 6px;
          background: rgba(244,236,216,0.08); border: 1px solid rgba(244,236,216,0.18); color: var(--cream);
          font-family: var(--font-body); font-size: 13px; padding: 7px 12px 7px 10px; border-radius: 999px; cursor: pointer; }
        .back-btn:hover { background: rgba(244,236,216,0.16); }
        .kicker { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold-light); margin: 0 0 6px; }
        .hero-jp { font-family: var(--font-display); font-size: 30px; font-weight: 700; margin: 44px 0 4px; line-height: 1.3; }
        .hero-en { color: var(--muted); font-size: 14px; margin: 0 0 30px; }
        .method-card { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; background: rgba(244,236,216,0.06);
          border: 1px solid rgba(244,236,216,0.14); border-radius: 14px; padding: 16px; margin-bottom: 12px; cursor: pointer;
          color: var(--cream); font-family: var(--font-body); transition: background 0.2s, transform 0.15s; }
        .method-card:hover { background: rgba(244,236,216,0.12); transform: translateY(-1px); }
        .method-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .method-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; margin: 0 0 2px; }
        .method-sub { font-size: 12.5px; color: var(--muted); margin: 0; }
        .page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; margin: 46px 0 6px; }
        .page-sub { color: var(--muted); font-size: 13px; margin: 0 0 22px; }
        .taste-pad { position: relative; width: 100%; max-width: 280px; aspect-ratio: 1; margin: 0 auto; border-radius: 16px;
          background: linear-gradient(180deg, rgba(207,167,82,0.14), rgba(192,57,43,0.10)); border: 1px solid rgba(244,236,216,0.18);
          touch-action: none; cursor: crosshair; }
        .pad-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(244,236,216,0.09) 1px, transparent 1px),
          linear-gradient(90deg, rgba(244,236,216,0.09) 1px, transparent 1px); background-size: 25% 25%; border-radius: 16px; pointer-events: none; }
        .pad-axis-label { position: absolute; font-size: 11px; letter-spacing: 0.08em; color: var(--gold-light); pointer-events: none; }
        .pad-dot { position: absolute; width: 22px; height: 22px; border-radius: 50%; background: var(--vermillion);
          border: 2px solid var(--cream); transform: translate(-50%, -50%); pointer-events: none;
          box-shadow: 0 0 0 6px rgba(192,57,43,0.25); }
        .pad-dot.dragging { box-shadow: 0 0 0 10px rgba(192,57,43,0.3); }
        .taste-readout { text-align: center; margin-top: 18px; font-family: var(--font-display); font-size: 17px; }
        .cta-btn { display: block; width: 100%; margin-top: 26px; background: var(--vermillion); color: var(--cream);
          border: none; border-radius: 999px; padding: 14px; font-size: 15px; font-weight: 700; font-family: var(--font-body);
          cursor: pointer; transition: background 0.2s, transform 0.15s; }
        .cta-btn:hover { background: var(--vermillion-dark); transform: translateY(-1px); }
        .reveal-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 480px; }
        .bottle-badge { position: relative; width: 92px; height: 92px; border-radius: 50%; background: rgba(207,167,82,0.16);
          border: 1px solid rgba(207,167,82,0.4); display: flex; align-items: center; justify-content: center;
          animation: scaleIn 0.5s ease both; overflow: hidden; }
        .bottle-badge::after { content: ""; position: absolute; left: -20%; width: 140%; height: 40%;
          background: linear-gradient(180deg, transparent, rgba(244,236,216,0.35), transparent); animation: shimmer 1.1s ease-in-out infinite; }
        .reveal-text { font-family: var(--font-display); font-size: 18px; margin-top: 18px; opacity: 0; animation: fadeSlideUp 0.5s ease 0.3s both; }
        .result-card { display: flex; gap: 14px; align-items: center; background: rgba(244,236,216,0.06); border: 1px solid rgba(244,236,216,0.14);
          border-radius: 14px; padding: 14px; margin-bottom: 12px; cursor: pointer; animation: cardIn 0.4s ease both; }
        .result-card:hover { background: rgba(244,236,216,0.12); }
        .match-badge { flex-shrink: 0; width: 54px; height: 54px; border-radius: 50%; border: 2px solid var(--gold);
          display: flex; align-items: center; justify-content: center; flex-direction: column; color: var(--gold-light); }
        .match-num { font-size: 15px; font-weight: 700; line-height: 1; }
        .match-pct { font-size: 8px; letter-spacing: 0.05em; }
        .result-name { font-family: var(--font-display); font-size: 16px; font-weight: 700; margin: 0; }
        .result-sub { font-size: 12px; color: var(--muted); margin: 3px 0 0; }
        .tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .tag-pill { font-size: 10.5px; background: rgba(207,167,82,0.15); color: var(--gold-light); border: 1px solid rgba(207,167,82,0.3);
          padding: 3px 9px; border-radius: 999px; }
        .map-svg-wrap { display: flex; justify-content: center; }
        .region-shape { cursor: pointer; fill: rgba(244,236,216,0.16); stroke: rgba(244,236,216,0.35); stroke-width: 1; transition: all 0.35s ease; }
        .region-shape.active { fill: var(--vermillion); stroke: var(--gold-light); }
        .region-shape.dim { opacity: 0.28; }
        .region-label { font-size: 10px; fill: var(--cream); pointer-events: none; text-anchor: middle; font-family: var(--font-body); }
        .region-panel { margin-top: 8px; animation: fadeSlideUp 0.4s ease both; }
        .region-panel-title { font-family: var(--font-display); font-size: 19px; margin: 0 0 4px; }
        .region-panel-desc { font-size: 13px; color: var(--muted); margin: 0 0 16px; line-height: 1.5; }
        .search-input { width: 100%; background: rgba(244,236,216,0.08); border: 1px solid rgba(244,236,216,0.2); border-radius: 12px;
          padding: 12px 14px; color: var(--cream); font-family: var(--font-body); font-size: 14px; margin-bottom: 18px; }
        .search-input::placeholder { color: var(--muted); }
        .search-input:focus { outline: none; border-color: var(--gold); }
        .detail-hero { text-align: center; margin: 40px 0 20px; }
        .detail-name { font-family: var(--font-display); font-size: 26px; font-weight: 700; margin: 8px 0 2px; }
        .detail-jp { color: var(--muted); font-size: 14px; margin: 0 0 4px; }
        .detail-loc { font-size: 12px; color: var(--gold-light); letter-spacing: 0.06em; text-transform: uppercase; }
        .attr-row { margin-bottom: 16px; }
        .attr-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 6px; }
        .attr-track { position: relative; height: 6px; border-radius: 999px; background: rgba(244,236,216,0.12); }
        .attr-fill-marker { position: absolute; top: 50%; width: 14px; height: 14px; border-radius: 50%; background: var(--gold);
          border: 2px solid var(--cream); transform: translate(-50%, -50%); transition: left 0.7s cubic-bezier(0.22,1,0.36,1); }
        .detail-desc { font-size: 13.5px; line-height: 1.6; color: var(--cream); margin: 20px 0; opacity: 0.92; }
        .fridge-badge { margin: 26px auto 4px; width: 150px; border-radius: 16px; text-align: center; padding: 16px 10px;
          background: linear-gradient(160deg, var(--gold-light), var(--gold)); color: var(--ink);
          animation: pulseGlow 2.4s ease-in-out infinite; }
        .fridge-badge-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75; }
        .fridge-badge-num { font-family: var(--font-display); font-size: 40px; font-weight: 700; line-height: 1.1; }
        .fridge-badge-sub { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.75; }
      `}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" />

      {screen !== "landing" && (
        <button className="back-btn" onClick={back}>
          <ArrowLeft size={16} /> Back
        </button>
      )}

      <div key={screen} className="screen">
        {screen === "landing" && (
          <div>
            <p className="kicker">Table 12 · Sake bar</p>
            <h1 className="hero-jp">今夜、どんな日本酒？</h1>
            <p className="hero-en">What kind of sake are you feeling tonight?</p>

            <button className="method-card" onClick={() => go("taste")}>
              <span className="method-icon" style={{ background: "rgba(192,57,43,0.22)" }}>
                <Compass size={20} color="#e9b7ad" />
              </span>
              <span>
                <p className="method-title">Find my sake</p>
                <p className="method-sub">Answer a couple of taste questions</p>
              </span>
            </button>

            <button className="method-card" onClick={() => go("map")}>
              <span className="method-icon" style={{ background: "rgba(207,167,82,0.22)" }}>
                <MapPin size={20} color="var(--gold-light)" />
              </span>
              <span>
                <p className="method-title">Explore Japan</p>
                <p className="method-sub">Discover sake by region</p>
              </span>
            </button>

            <button className="method-card" onClick={() => go("search")}>
              <span className="method-icon" style={{ background: "rgba(244,236,216,0.14)" }}>
                <Search size={20} color="var(--cream)" />
              </span>
              <span>
                <p className="method-title">Search sake</p>
                <p className="method-sub">Know the name? Look it up directly</p>
              </span>
            </button>
          </div>
        )}

        {screen === "taste" && (
          <div>
            <h2 className="page-title">Plot your taste</h2>
            <p className="page-sub">Drag the mark to where your mood sits.</p>

            <div
              className="taste-pad"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(true);
                updatePad(e);
              }}
              onPointerMove={(e) => dragging && updatePad(e)}
              onPointerUp={() => setDragging(false)}
            >
              <div className="pad-grid" />
              <span className="pad-axis-label" style={{ top: 8, left: "50%", transform: "translateX(-50%)" }}>RICH</span>
              <span className="pad-axis-label" style={{ bottom: 8, left: "50%", transform: "translateX(-50%)" }}>LIGHT</span>
              <span className="pad-axis-label" style={{ left: 8, top: "50%", transform: "translateY(-50%)" }}>DRY</span>
              <span className="pad-axis-label" style={{ right: 8, top: "50%", transform: "translateY(-50%)" }}>SWEET</span>
              <div
                className={"pad-dot" + (dragging ? " dragging" : "")}
                style={{ left: taste.x + "%", top: 100 - taste.y + "%" }}
              />
            </div>

            <p className="taste-readout">{describeTaste(taste.x, taste.y)}</p>

            <button className="cta-btn" onClick={revealMatches}>
              Reveal my sake
            </button>
          </div>
        )}

        {screen === "reveal" && (
          <div className="reveal-wrap">
            {!revealed ? (
              <>
                <div className="bottle-badge">
                  <Wine size={38} color="var(--gold-light)" />
                </div>
                <p className="reveal-text">Finding your sake…</p>
              </>
            ) : (
              <div style={{ width: "100%" }}>
                <p className="kicker" style={{ textAlign: "center" }}>Your matches</p>
                <h2 className="page-title" style={{ textAlign: "center", marginTop: 4 }}>We found 3 for you</h2>
                <div style={{ marginTop: 20 }}>
                  {matches.map((s, i) => (
                    <div
                      key={s.id}
                      className="result-card"
                      style={{ animationDelay: i * 0.12 + "s" }}
                      onClick={() => openDetail(s)}
                    >
                      <div className="match-badge">
                        <span className="match-num">{s.match}%</span>
                        <span className="match-pct">MATCH</span>
                      </div>
                      <div>
                        <p className="result-name">{s.name}</p>
                        <p className="result-sub">{s.prefecture} · {s.category}</p>
                        <div className="tag-row">
                          {s.tags.slice(0, 2).map((t) => (
                            <span className="tag-pill" key={t}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {screen === "map" && (
          <div>
            <h2 className="page-title">Explore by region</h2>
            <p className="page-sub">Tap a region of Japan to see its sake.</p>

            <div className="map-svg-wrap">
              <svg width="220" height="520" viewBox="0 0 260 520">
                {REGIONS.map((r) => (
                  <g
                    key={r.id}
                    onClick={() => setActiveRegion(r)}
                    transform={"rotate(" + r.rot + " " + r.cx + " " + r.cy + ")"}
                  >
                    <ellipse
                      className={
                        "region-shape" +
                        (activeRegion?.id === r.id ? " active" : "") +
                        (activeRegion && activeRegion.id !== r.id ? " dim" : "")
                      }
                      cx={r.cx}
                      cy={r.cy}
                      rx={r.rx}
                      ry={r.ry}
                    />
                    <text className="region-label" x={r.cx} y={r.cy + 4}>{r.name}</text>
                  </g>
                ))}
              </svg>
            </div>

            {activeRegion && (
              <div className="region-panel">
                <p className="region-panel-title">{activeRegion.name} · {activeRegion.jp}</p>
                <p className="region-panel-desc">{activeRegion.desc}</p>
                {regionSake.map((s, i) => (
                  <div key={s.id} className="result-card" style={{ animationDelay: i * 0.1 + "s" }} onClick={() => openDetail(s)}>
                    <div className="match-badge" style={{ borderColor: "var(--muted)" }}>
                      <span className="match-num" style={{ fontSize: 12 }}>{s.prefecture}</span>
                    </div>
                    <div>
                      <p className="result-name">{s.name}</p>
                      <p className="result-sub">{s.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {screen === "search" && (
          <div>
            <h2 className="page-title">Search sake</h2>
            <p className="page-sub">Search by name, brewery, or prefecture.</p>
            <input
              className="search-input"
              placeholder="e.g. Dassai, Niigata, Junmai…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searchResults.map((s, i) => (
              <div key={s.id} className="result-card" style={{ animationDelay: i * 0.05 + "s" }} onClick={() => openDetail(s)}>
                <div className="match-badge" style={{ borderColor: "var(--muted)" }}>
                  <Wine size={20} color="var(--gold-light)" />
                </div>
                <div>
                  <p className="result-name">{s.name}</p>
                  <p className="result-sub">{s.prefecture} · {s.category}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === "detail" && selected && (
          <div>
            <div className="detail-hero">
              <Wine size={30} color="var(--gold-light)" />
              <p className="detail-name">{selected.name}</p>
              <p className="detail-jp">{selected.jp} · {selected.brewery}</p>
              <p className="detail-loc">{selected.prefecture}, Japan · {selected.category}</p>
            </div>

            <div className="attr-row">
              <div className="attr-labels"><span>Dry</span><span>Sweet</span></div>
              <div className="attr-track">
                <div className="attr-fill-marker" style={{ left: selected.sweetness + "%" }} />
              </div>
            </div>
            <div className="attr-row">
              <div className="attr-labels"><span>Light</span><span>Rich</span></div>
              <div className="attr-track">
                <div className="attr-fill-marker" style={{ left: selected.body + "%" }} />
              </div>
            </div>

            <p className="detail-desc">{selected.desc}</p>

            <p className="kicker" style={{ marginTop: 18 }}>Pairs well with</p>
            <div className="tag-row">
              {selected.tags.map((t) => (
                <span className="tag-pill" key={t}>{t}</span>
              ))}
            </div>

            <div className="fridge-badge">
              <p className="fridge-badge-label">Find me</p>
              <p className="fridge-badge-num">#{selected.fridge}</p>
              <p className="fridge-badge-sub">in the fridge</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
