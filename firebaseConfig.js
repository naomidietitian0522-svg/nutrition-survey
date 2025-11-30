// firebaseConfig.js

// 從 Google CDN 引入必要的 Firebase SDK 模組
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js"; // 引入 Analytics 模組

// 🚨 您的 Firebase 配置代碼 (請確認與您在 Console 中取得的完全一致)
const firebaseConfig = {
  apiKey: "AIzaSyDQVfe0Qd056x3RCQe9oxWX4_7IOcgk4t8",
  authDomain: "dietitian-survey.firebaseapp.com",
  projectId: "dietitian-survey",
  storageBucket: "dietitian-survey.firebasestorage.app",
  messagingSenderId: "376160961414",
  appId: "1:376160961414:web:7aada6d75a6f46c73c6207",
  measurementId: "G-L6CXRN71XL"
};

// 1. 初始化 Firebase 應用程式
const app = initializeApp(firebaseConfig);

// 2. 獲取 Firestore 資料庫實例
const db = getFirestore(app);

// 3. 啟用 Analytics 
const analytics = getAnalytics(app); 

// 4. 導出 db，供 app.js 使用
export { db };