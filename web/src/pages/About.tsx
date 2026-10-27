type AboutProps = {
  marketCount?: number;
  block?: string | null;
  onOpenMap?: () => void;
  onOpenRisk?: () => void;
};

const steps = [
  {
    n: "01",
    title: "Read every open position",
    body: "The server lists the holders of every dreamDEX perp market on Somnia Hideki and reads each position straight from the chain. No exchange API, no sampling.",
  },
  {
    n: "02",
    title: "Price each liquidation",
    body: "For every position it computes the mark price where that account would hit maintenance margin, using the same math the protocol uses.",
  },
  {
    n: "03",
    title: "Rank the money, not the lines",
    body: "Liquidation prices are grouped into tight bands and ranked by total USDso notional. Only the bands holding the most money become wipeout zones, three at most per market.",
  },
];

const terms = [
  {
    term: "Wipeout zone",
    def: "A price band where a large share of a market's open notional would be force-closed. A band needs at least 8% of the market's liquidatable notional and $25K to qualify.",
  },
  {
    term: "Notional",
    def: "The dollar size of the positions in the band, valued at the current mark. This is what the zones are ranked by.",
  },
  {
    term: "Distance",
    def: "How far the mark has to move to reach the zone, as a percentage. Smaller means closer to a cascade.",
  },
  {
    term: "Cross margin",
    def: "Accounts open in two or more markets share one margin pool. A correlated move can liquidate them sooner than any single-market number shows, so treat every price as an estimate.",
  },
];

const guarantees = [
  { title: "Your keys stay with you", body: "Every order is signed in your own browser wallet. The server never holds a private key and cannot move funds." },
  { title: "Every figure is timestamped", body: "Numbers carry the block they were read at and their age. Anything older than 30 seconds is marked stale." },
  { title: "Bad price, no trade", body: "If a market's oracle feed is not healthy, ordering on that market is switched off until it recovers." },
  { title: "Stops come first", body: "Riding a cascade requires a stop-loss before the entry button unlocks, and the stop is placed as a real order." },
];

export function About({ marketCount, block, onOpenMap, onOpenRisk }: AboutProps) {
  return (
    <article className="about">
      <header className="about-hero">
        <p className="about-eyebrow">About Wipeout Map</p>
        <h1>
          See where everyone gets wiped out<span>,</span> before you do.
        </h1>
        <p className="about-lede">
          Liquidation heatmaps on centralized exchanges are estimates built from guesses. On dreamDEX every position is
          public, so Wipeout Map computes the real thing: the price bands where the most money would be liquidated, live,
          across every perp market.
        </p>
        <dl className="about-facts">
          <div><dt>Markets mapped</dt><dd>{marketCount ? marketCount : "All"}</dd></div>
          <div><dt>Data source</dt><dd>Onchain</dd></div>
          <div><dt>Latest block</dt><dd>{block ? `#${Number(block).toLocaleString("en-US")}` : "Syncing"}</dd></div>
        </dl>
        {(onOpenMap || onOpenRisk) && (
          <div className="about-cta">
            {onOpenMap && <button className="act primary" onClick={onOpenMap}>Open the map</button>}
            {onOpenRisk && <button className="act" onClick={onOpenRisk}>Check my risk</button>}
          </div>
        )}
      </header>

      <section className="about-section">
        <h2>How it works</h2>
        <ol className="about-steps">
          {steps.map((step) => (
            <li key={step.n}>
              <span className="about-num">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-section">
        <h2>Reading the map</h2>
        <dl className="about-terms">
          {terms.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>{item.def}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="about-section">
        <h2>Built to be trusted</h2>
        <ul className="about-guarantees">
          {guarantees.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="about-foot">
        <p>
          Built on <strong>dreamDEX</strong> and <strong>Somnia</strong> for the dreamDEX × Somnia Perps Builder Bounty.
          Running on Somnia Hideki testnet with USDso margin.
        </p>
        <p className="about-disclaimer">Testnet only. Nothing here is financial advice.</p>
      </footer>
    </article>
  );
}
