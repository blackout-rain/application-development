// ストア版のクラウド保存。ゲーム本体（index.html）は window.AppCloud だけを見ます。
// Googleログイン + Firestore（saves/{uid} に1人1件）。アプリ内では端末のGoogleログインを使い、
// ブラウザで試すときは、ポップアップでログインします。
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut as fbSignOut, onAuthStateChanged, deleteUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import config from './firebase-config.js';

const native = Capacitor.isNativePlatform();
let auth = null, db = null;

const err = (code, message) => Object.assign(new Error(message || code), { code });
const configured = () => config.apiKey && !String(config.apiKey).startsWith('YOUR_');
const ensure = () => {
  if (!configured()) throw err('not_configured', 'firebase-config.js が未入力です');
  if (!auth) { const app = initializeApp(config); auth = getAuth(app); db = getFirestore(app); }
};
const ref = () => doc(db, 'saves', auth.currentUser.uid);
const toUser = (u) => (u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null);

async function signInGoogle() {
  if (native) {
    // アプリ内では、端末のGoogleログイン画面を使う（WebView内のポップアップはGoogleに拒否されるため）
    const r = await FirebaseAuthentication.signInWithGoogle();
    const idToken = r.credential && r.credential.idToken;
    if (!idToken) throw err('cancelled', 'ログインが中断されました');
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  } else {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }
}

window.AppCloud = {
  name: 'firebase',
  // 起動時に呼ばれる。ログイン済みならユーザーを、そうでなければ null を返す
  async init() {
    ensure();
    await auth.authStateReady();
    return toUser(auth.currentUser);
  },
  async signIn() {
    ensure();
    try { await signInGoogle(); }
    catch (e) {
      const code = e && (e.code || '');
      if (/cancel|closed-by-user|popup-closed/i.test(String(code) + String(e && e.message))) throw err('cancelled');
      throw e;
    }
    return toUser(auth.currentUser);
  },
  async signOut() {
    ensure();
    if (native) { try { await FirebaseAuthentication.signOut(); } catch (e) { /* 端末側が未ログインでも続ける */ } }
    await fbSignOut(auth);
  },
  async get() {
    const s = await getDoc(ref());
    return s.exists() ? s.data() : null;
  },
  async put(d) {
    await setDoc(ref(), d);
  },
  async remove() {
    await deleteDoc(ref());
  },
  // アカウント削除（Google Playの要件）。直前のログインから時間がたっていると、再ログインを求められる
  async deleteAccount() {
    ensure();
    const u = auth.currentUser;
    if (!u) return;
    try { await deleteUser(u); }
    catch (e) {
      if (e && e.code === 'auth/requires-recent-login') {
        await signInGoogle();
        await deleteUser(auth.currentUser);
      } else throw e;
    }
    if (native) { try { await FirebaseAuthentication.signOut(); } catch (e) { /* 無視 */ } }
  }
};
