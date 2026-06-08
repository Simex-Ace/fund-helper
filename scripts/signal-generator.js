/**
 * signal-generator.js — 每日自动生成信号
 * 在 GitHub Actions 中每天 9:00 运行
 * 读取免费 API 数据 → 生成信号 → 更新 index.html
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const HTML_FILE = path.join(PUBLIC_DIR, 'index.html');

// ====== 免费数据源 ======
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { try { resolve(data); } catch(e2) { resolve(null); } }
      });
    }).on('error', reject);
  });
}

// 腾讯行情：实时报价
function fetchTencentQuotes(codes) {
  return new Promise((resolve) => {
    const url = `https://web.sqt.gtimg.cn/q=${codes.join(',')}&t=${Date.now()}`;
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const result = {};
        codes.forEach(code => {
          const re = new RegExp(`v_${code.replace(/\./g,'_')}="([^"]+)"`);
          const m = data.match(re);
          if (m) {
            const parts = m[1].split('~');
            result[code] = {
              name: parts[1], price: parseFloat(parts[3]), 
              prevClose: parseFloat(parts[4]),
              chgPct: parts[32] ? parseFloat(parts[32]) : 
                (parts[3]&&parts[4] ? ((parts[3]-parts[4])/parts[4]*100) : 0)
            };
          }
        });
        resolve(result);
      });
    }).on('error', () => resolve({}));
  });
}

// 东方财富：板块排行
function fetchEastMoneyBoard() {
  return fetchJSON('https://push2.eastmoney.com/api/qt/clist/get?cb=&pn=1&pz=10&po=1&np=1&fields=f2,f3,f4,f12,f14&fs=m:90+t:2');
}

// 东方财富：北向资金
function fetchNorthFlow() {
  return fetchJSON('https://push2.eastmoney.com/api/qt/kamt.kline/get?secid=1&fields1=f1,f2&fields2=f51,f52,f53,f54,f55&klt=1&lmt=5');
}

// 热搜（腾讯自选股）
function fetchHotStocks() {
  return fetchJSON('https://web.ifzq.gtimg.cn/appstock/app/hk/search/hot?type=stock');
}

// ====== 信号生成器 ======
function generateSignals(quotes, board, northFlow, hot) {
  const signals = [];
  let id = 1;
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  // 1. 根据各大指数生成市场温度信号
  if (quotes['sh000001']) {
    const sh = quotes['sh000001'];
    if (sh.chgPct < -1) signals.push({ id:id++, title:`上证指数下跌${sh.chgPct.toFixed(2)}%`, type:'市场波动', risk:'mid', kind:'stock', market:'ashare', tag:'大盘预警', tagClass:'warn', detail:`上证指数今日报${sh.price}，下跌${sh.chgPct.toFixed(2)}%，市场整体偏弱`, time:`今日 ${timeStr}` });
    else if (sh.chgPct > 1) signals.push({ id:id++, title:`上证指数上涨${sh.chgPct.toFixed(2)}%`, type:'市场波动', risk:'low', kind:'stock', market:'ashare', tag:'大盘向好', tagClass:'north', detail:`上证指数今日报${sh.price}，上涨${sh.chgPct.toFixed(2)}%，市场情绪积极`, time:`今日 ${timeStr}` });
  }

  // 2. 板块排行信号
  if (board && board.data && board.data.diff) {
    const top = board.data.diff.slice(0, 3);
    top.forEach((b, i) => {
      const chg = b.f3 || 0;
      signals.push({ id:id++, title:`${b.f14||'板块'}${chg>0?'拉升':'回调'}`, type:'板块异动', risk:Math.abs(chg)>3?'high':Math.abs(chg)>1?'mid':'low', kind:'etf', market:'ashare', tag:i===0?'领涨':'板块轮动', tagClass:chg>0?'buy':'warn', detail:`${b.f14||'板块'}今日涨跌幅${chg.toFixed(2)}%，排名前列`, time:`今日 ${timeStr}` });
    });
  }

  // 3. 北向资金信号
  if (northFlow && northFlow.data && northFlow.data.klines) {
    const last = northFlow.data.klines[northFlow.data.klines.length - 1].split(',');
    const flow = parseFloat(last[1]);
    if (Math.abs(flow) > 10) {
      signals.push({ id:id++, title:`北向资金${flow>0?'大幅流入':'大幅流出'}${Math.abs(flow).toFixed(0)}亿`, type:'资金流向', risk:'high', kind:'stock', market:'ashare', tag:flow>0?'北向加仓':'北向卖出', tagClass:flow>0?'north':'warn', detail:`北向资金今日${flow>0?'净流入':'净流出'}${Math.abs(flow).toFixed(2)}亿，资金态度${flow>0?'积极':'谨慎'}`, time:`今日 ${timeStr}` });
    }
  }

  // 4. 热搜股票信号
  if (Array.isArray(hot)) {
    hot.slice(0, 5).forEach(h => {
      if (h && h.name) {
        signals.push({ id:id++, title:`${h.name} 热度飙升`, type:'热搜异动', risk:'high', kind:'stock', market:'ashare', tag:'热度', tagClass:'buy', detail:`${h.name}热度飙升，市场关注度极高，注意波动风险`, time:`今日 ${timeStr}` });
      }
    });
  }

  // 5. 港股指数信号
  if (quotes['hkHSI']) {
    const hsi = quotes['hkHSI'];
    if (Math.abs(hsi.chgPct) > 1.5) {
      signals.push({ id:id++, title:`恒指${hsi.chgPct>0?'上涨':'下跌'}${Math.abs(hsi.chgPct).toFixed(2)}%`, type:'港股市场', risk:hsi.chgPct<0?'high':'mid', kind:'stock', market:'hk', tag:hsi.chgPct>0?'港股走强':'港股走弱', tagClass:hsi.chgPct>0?'north':'warn', detail:`恒生指数报${hsi.price}，${hsi.chgPct>0?'上涨':'下跌'}${Math.abs(hsi.chgPct).toFixed(2)}%`, time:`今日 ${timeStr}` });
    }
  }

  // 最少保证3条
  return signals.slice(0, 15);
}

// ====== 更新 HTML ======
function updateHtml(signals) {
  let html = fs.readFileSync(HTML_FILE, 'utf-8');
  
  // 替换信号数据
  const signalStr = JSON.stringify(signals);
  html = html.replace(
    /signals:\s*\[[\s\S]*?\]/,
    `signals: ${signalStr}`
  );

  // 更新日期
  const today = new Date();
  const dateStr = today.toISOString().slice(0,10);
  html = html.replace(/'2026-\d{2}-\d{2}'/, `'${dateStr}'`);

  fs.writeFileSync(HTML_FILE, html, 'utf-8');
  console.log(`[OK] 已更新 ${signals.length} 条信号`);
}

// ====== 主流程 ======
async function main() {
  console.log('[开始] 拉取数据...');
  
  const codes = ['sh000001','sz399001','sz399006','hkHSI','hkHSCEI','hkHSTECH','sh600519','sz000858'];
  const [quotes, board, northFlow] = await Promise.all([
    fetchTencentQuotes(codes),
    fetchEastMoneyBoard(),
    fetchNorthFlow()
  ]);
  
  console.log('[OK] 数据获取完成');
  
  const signals = generateSignals(quotes, board, northFlow, []);
  updateHtml(signals);
  console.log(`[完成] 生成了 ${signals.length} 条信号`);
}

main().catch(e => { console.error('[失败]', e.message); process.exit(1); });
