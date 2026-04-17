// P&L Analysis - All Trading Days
// Feb 13 Actual: NYC 33.6F, CHI 52.2F, MIA 79.2F, AUS 79.8F, LAX 69.2F
// Feb 14 Actual: NYC 38.5F, CHI 49.9F, MIA 77.7F, AUS 74.8F, LAX 66.4F
// Feb 15 Actual (archive): NYC 36.0F, CHI 55.4F, AUS 72.4F

console.log('================================================================');
console.log('  FULL P&L ANALYSIS - All Trading Days');
console.log('================================================================');

// Feb 13 Trades
console.log('\n=== FEB 13 TRADES (SETTLED) ===');
console.log('Actuals: NYC 33.6F | CHI 52.2F | MIA 79.2F | AUS 79.8F | LAX 69.2F\n');

// Kalshi weather settlement logic:
// Bracket BXX.5 = "XX to XX+1 F" - YES if actual is in that range, NO otherwise
// Threshold TXX = "XX+1 F or higher" - YES if actual >= XX+1, NO if actual <= XX
// KXHIGHNY-26FEB13-B37.5 = "High temp 37-38F?" NYC actual 33.6 -> NOT in bracket -> NO wins
// KXHIGHCHI-26FEB13-T48 = "49F or higher?" CHI actual 52.2 -> >=49 -> YES wins
// KXHIGHCHI-26FEB13-B52.5 = "High temp 52-53F?" CHI actual 52.2 -> IS in bracket -> YES wins, our NO loses
// KXHIGHMIA-26FEB13-T80 = "81F or higher" NO means <=80. MIA actual 79.2 -> <=80 -> NO wins
// KXHIGHAUS-26FEB13-T78 = "79F or higher" YES. AUS actual 79.8 -> >=79 -> YES wins
// KXHIGHAUS-26FEB13-B82.5 = "82-83F?" NO. AUS actual 79.8 -> NOT in bracket -> NO wins
// KXHIGHLAX-26FEB13-B70.5 = "70-71F?" NO. LAX actual 69.2 -> NOT in bracket -> NO wins
// KXHIGHLAX-26FEB13-B68.5 = "68-69F?" NO. LAX actual 69.2 -> IS in bracket (NWS rounds to 69) -> YES wins, NO loses

const results = [
  { ticker: 'NYC B37.5 NO x100', cost: 100*0.55, win: true, payout: 100*1.00, note: 'Actual 33.6F, NOT in 37-38F -> NO wins' },
  { ticker: 'CHI T48 YES x50', cost: 50*0.04, win: true, payout: 50*1.00, note: 'Actual 52.2F >= 49F -> YES wins' },
  { ticker: 'CHI B52.5 NO x53', cost: 53*0.38, win: false, payout: 0, note: 'Actual 52.2F IS in 52-53F -> YES wins, NO loses' },
  { ticker: 'MIA T80 NO x50', cost: 50*0.48, win: true, payout: 50*1.00, note: 'Actual 79.2F <= 80F -> NO wins' },
  { ticker: 'AUS T78 YES x50', cost: 50*0.03, win: true, payout: 50*1.00, note: 'Actual 79.8F >= 79F -> YES wins' },
  { ticker: 'AUS B82.5 NO x22', cost: 22*0.53, win: true, payout: 22*1.00, note: 'Actual 79.8F NOT in 82-83F -> NO wins' },
  { ticker: 'LAX B70.5 NO x50', cost: 50*0.38, win: true, payout: 50*1.00, note: 'Actual 69.2F NOT in 70-71F -> NO wins' },
  { ticker: 'LAX B68.5 NO x50', cost: 50*0.37, win: false, payout: 0, note: 'Actual 69F IS in 68-69F -> YES wins, NO loses' },
];

let totalCost = 0, totalPayout = 0, wins = 0, losses = 0;
for (const r of results) {
  const pnl = r.payout - r.cost;
  totalCost += r.cost;
  totalPayout += r.payout;
  if (r.win) wins++; else losses++;
  const icon = r.win ? '[WIN] ' : '[LOSS]';
  console.log('  ' + icon + ' ' + r.ticker.padEnd(25) + ' Cost: $' + r.cost.toFixed(2).padStart(6) + ' -> Payout: $' + r.payout.toFixed(2).padStart(6) + ' | PnL: ' + (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2).padStart(6) + ' | ' + r.note);
}

const grossPnl = totalPayout - totalCost;
console.log('\n  Summary: ' + wins + 'W / ' + losses + 'L');
console.log('  Total Cost:   $' + totalCost.toFixed(2));
console.log('  Total Payout: $' + totalPayout.toFixed(2));
console.log('  Gross P&L:    ' + (grossPnl >= 0 ? '+' : '') + '$' + grossPnl.toFixed(2));

// Feb 15 positions (today)
console.log('\n=== FEB 15 POSITIONS (TODAY - SETTLING) ===');
console.log('Actual temps: CHI 55.4F | AUS 72.4F\n');

const feb15 = [
  { ticker: 'AUS T71 YES x25', cost: 25*0.08, actual: 72.4, win: true, payout: 25*1.00, note: '72.4F >= 72F -> YES wins' },
  { ticker: 'AUS B75.5 NO x25', cost: 25*0.59, actual: 72.4, win: true, payout: 25*1.00, note: '72.4F NOT in 75-76F -> NO wins' },
  { ticker: 'AUS B73.5 NO x13', cost: 13*0.25, actual: 72.4, win: true, payout: 13*1.00, note: '72.4F NOT in 73-74F -> NO wins' },
  { ticker: 'CHI B57.5 NO x9', cost: 9*0.33, actual: 55.4, win: true, payout: 9*1.00, note: '55.4F NOT in 57-58F -> NO wins' },
  { ticker: 'CHI B59.5 NO x11', cost: 11*0.14, actual: 55.4, win: true, payout: 11*1.00, note: '55.4F NOT in 59-60F -> NO wins' },
];

let feb15Cost = 0, feb15Payout = 0, feb15W = 0, feb15L = 0;
for (const r of feb15) {
  const pnl = r.payout - r.cost;
  feb15Cost += r.cost;
  feb15Payout += r.payout;
  if (r.win) feb15W++; else feb15L++;
  const icon = r.win ? '[WIN] ' : '[LOSS]';
  console.log('  ' + icon + ' ' + r.ticker.padEnd(25) + ' Cost: $' + r.cost.toFixed(2).padStart(6) + ' -> Payout: $' + r.payout.toFixed(2).padStart(6) + ' | PnL: ' + (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2).padStart(6));
}
const feb15Gross = feb15Payout - feb15Cost;
console.log('\n  Summary: ' + feb15W + 'W / ' + feb15L + 'L | ALL WINNERS');
console.log('  Total Cost:   $' + feb15Cost.toFixed(2));
console.log('  Total Payout: $' + feb15Payout.toFixed(2));
console.log('  Gross P&L:    +$' + feb15Gross.toFixed(2));

// Feb 16 positions (tomorrow)
console.log('\n=== FEB 16 POSITIONS (TOMORROW - OPEN) ===');
console.log('Forecast: CHI 58.9F | AUS 64.6F\n');

const feb16 = [
  { ticker: 'AUS T74 YES x25', cost: 25*0.07, forecast: 64.6, note: 'Forecast 64.6F - need >=75F for YES. Likely LOSES.' },
  { ticker: 'AUS B78.5 NO x11', cost: 11*0.37, forecast: 64.6, note: 'Forecast 64.6F NOT in 78-79F -> NO likely wins' },
  { ticker: 'CHI B64.5 NO x12', cost: 12*0.23, forecast: 58.9, note: 'Forecast 58.9F NOT in 64-65F -> NO likely wins' },
];

for (const r of feb16) {
  console.log('  [OPEN] ' + r.ticker.padEnd(25) + ' Cost: $' + r.cost.toFixed(2).padStart(6) + ' | ' + r.note);
}

// Overall
console.log('\n================================================================');
console.log('  OVERALL PERFORMANCE');
console.log('================================================================');
console.log('  Starting Balance:   $196.08 (Feb 13 morning)');
console.log('  Current Balance:    $114.82 ($56.94 cash + $57.88 portfolio)');
console.log('  Feb 13 Gross P&L:   ' + (grossPnl >= 0 ? '+' : '') + '$' + grossPnl.toFixed(2));
console.log('  Feb 15 Gross P&L:   +$' + feb15Gross.toFixed(2) + ' (pending settlement)');
console.log('  Feb 16 Exposure:    $' + feb16.reduce((s,r) => s + r.cost, 0).toFixed(2) + ' (open)');
console.log('  Estimated Fees:     ~$' + ((totalCost + feb15Cost) * 0.035).toFixed(2));
