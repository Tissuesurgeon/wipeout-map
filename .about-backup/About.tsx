export function About() {
  return (
    <article className="about">
      <h1>Wipeout Map</h1>
      <p>
        Centralized liquidation heatmaps are guesses. dreamDEX positions are public on Somnia Hideki,
        so this map is computed from open positions on all perp markets. A wipeout zone is a band of
        liquidation prices ranked by USDso notional.
      </p>
      <p>
        A liquidation price is the mark where this market alone would pull account equity down to
        maintenance margin. Accounts in two or more markets are cross margin: a correlated move
        liquidates sooner than either number.
      </p>
      <p>
        Every figure is stamped with its block and age. After 30 seconds the card is marked stale.
        If the oracle feed is not ok, orders on that market stay disabled.
      </p>
      <p>Orders are signed in your browser wallet. This server holds no keys. Hideki testnet is not advice.</p>
    </article>
  );
}
