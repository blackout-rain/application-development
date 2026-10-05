// アプリ版の通知（ローカル通知）。ゲーム本体は window.AppNotify があれば使う（Webでは存在しない）
import { LocalNotifications } from '@capacitor/local-notifications';

const IDS = { away: 1001, daily: 1002 };
const all = () => Object.values(IDS).map(id => ({ id }));

async function ensure() {
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await LocalNotifications.requestPermissions();
    return p.display === 'granted';
  } catch (e) { return false; }
}

window.AppNotify = {
  // items: [{ k:'away'|'daily', at:ミリ秒, title, body }]
  async schedule(items) {
    try {
      if (!(await ensure())) return;
      await LocalNotifications.cancel({ notifications: all() });
      await LocalNotifications.schedule({ notifications: items.filter(i => IDS[i.k]).map(i => ({ id: IDS[i.k], title: i.title, body: i.body, schedule: { at: new Date(i.at), allowWhileIdle: true } })) });
    } catch (e) { /* 通知が使えなくても、ゲームは続けられる */ }
  },
  async cancel() { try { await LocalNotifications.cancel({ notifications: all() }); } catch (e) { } }
};
