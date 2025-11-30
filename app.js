// app.js



// 導入資料庫實例 (db)

import { db } from './firebaseConfig.js';



// 導入 Firestore 寫入資料所需的函數

import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



// =======================================================

// A. 全局狀態儲存

// =======================================================

let userData = {};

let allSurveyQuestions = [];





// =======================================================

// B. TDEE/BMR 計算函數 (Mifflin-St Jeor Equation)

// =======================================================

function calculateTDEE(gender, age, height, weight, af) {

    let bmr;

   

    // BMR 公式

    if (gender === 'male') {

        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;

    } else { // female

        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;

    }

   

    // TDEE = BMR * 活動因子

    const tdee = bmr * af;

    const targetCal = tdee - 500;

   

    return { bmr: Math.round(bmr), tdee: Math.round(tdee), targetCal: Math.round(targetCal) };

}





// =======================================================

// C. 問卷計分和診斷函數 (核心邏輯)

// =======================================================

function getSurveyResults(answers) {

    let totalScore = 0;

    const diagnosisList = [];

    const questionScores = {};



    // 診斷文案庫 (Diagnosis Lookup Table)

    const diagnosisMap = {

        Q1: "🎯彩虹蔬果大作戰！每日的蔬菜量攝取不足，會讓營養攝取不均衡。",

        Q2: "💪蛋白質補給大升級！蛋白質攝取偏低，可能讓代謝和肌肉修復跟不上您的努力腳步。",

        Q3: "💧水分警報響起！每日水分攝取明顯不足，會拖慢代謝，也讓飽足感大打折扣。",

        Q4: "🔥減脂最大絆腳石！含糖飲料是您目前最大的熱量來源。",

        Q5: "⏰規律飲食任務!飲食時間太跳TONE ，容易讓血糖不穩、脂肪更容易悄悄囤積。",

        Q6: "🌙修復代謝，從睡覺開始！睡眠不足會導致荷爾蒙紊亂，讓您在白天更容易想吃高熱量食物。"

    };



    // 計算總分並找出低分項目

    for (const key in answers) {

        const score = answers[key];

        questionScores[key] = score;

        totalScore += score;

       

        // 鎖定得分 1 或 2 的項目作為修正建議 (診斷)

        if (score <= 2 && diagnosisMap[key]) {

            diagnosisList.push(diagnosisMap[key]);

        }

    }

   

    // 輸出前三項最嚴重的診斷建議

    const finalDiagnosis = diagnosisList.slice(0, 3);

   

    return { totalScore, diagnosis: finalDiagnosis, questionScores };

}





// =======================================================

// D. 資料提交函數 (寫入 Firestore - 已移除 alert)

// =======================================================

async function submitFinalReport(finalData) {

    if (!db) {

        console.error("Firestore 連線失敗，無法提交資料。");

        return false;

    }



    try {

        // 移除圖表所需的欄位，確保資料乾淨

        const dataToSave = {

            ...finalData,

            questionScores: undefined

        };

        const docRef = await addDoc(collection(db, "surveyResults"), dataToSave);

        console.log("資料寫入 Firestore 成功，文件 ID: ", docRef.id);

        return true;

    } catch (e) {

        // 🚨 修正：移除 alert 彈窗，只在控制台記錄錯誤

        console.error("寫入資料庫時發生錯誤: ", e, e.message);

        return false; // 即使失敗也靜默返回 false

    }

}





// =======================================================

// E. 介面階段切換函數 (通用函數 - 使用 Class 控制，修正隱藏邏輯)

// =======================================================

function switchStage(fromStage, toStage) {

   

    // 1. 移除舊階段的 active 狀態

    if (fromStage) {

        const fromEl = document.getElementById(`stage-${fromStage}`);

        if (fromEl) {

            fromEl.classList.remove('active-stage');

        } else {

            console.warn(`警告: 找不到舊階段元素 stage-${fromStage}`);

        }

    }

   

    // 2. 設置新階段為 active 狀態

    const toEl = document.getElementById(`stage-${toStage}`);

    if (toEl) {

        toEl.classList.add('active-stage');

    } else {

        console.error(`無法找到目標階段: stage-${toStage}`);

        return;

    }

   

    window.scrollTo({ top: 0, behavior: 'smooth' });

    console.log(`階段切換成功：Stage ${fromStage || 'Init'} -> Stage ${toStage}`);

}





// =======================================================

// F. 處理階段一提交邏輯 (數據收集與 TDEE 計算)

// =======================================================

function handleStage1Submission() {

    // 1. 收集數據

    const gender = document.getElementById('gender').value;

    const age = parseInt(document.getElementById('age').value);

    const height = parseInt(document.getElementById('height-slider').value);

    const weight = parseInt(document.getElementById('weight-slider').value);

    const af = parseFloat(document.getElementById('activity-factor').value);

   

    // 2. 輸入驗證

    if (!gender || isNaN(age) || isNaN(height) || isNaN(weight) || isNaN(af)) {

        alert("請確認所有欄位都已填寫或選取，年齡/身高/體重必須是有效數字！");

        return;

    }



    // 3. 執行 TDEE 計算

    const tdeeResult = calculateTDEE(gender, age, height, weight, af);

   

    // 4. 儲存數據到全局變數

    userData = {

        gender, age, height, weight, af,

        ...tdeeResult

    };



    console.log("階段一數據收集完成，結果已儲存:", userData);

   

    // 5. 介面轉換：從階段一切換到階段二

    renderSurveyQuestions();

    switchStage(1, 2);

}





// =======================================================

// G. 階段一：數據輸入介面互動邏輯 (核心綁定 - 修正後僅負責綁定)

// =======================================================

function initializeStage1Interaction() {

    console.log("初始化階段一介面...");



    const setupSlider = (sliderId, valueId) => {

        const slider = document.getElementById(sliderId);

        const valueSpan = document.getElementById(valueId);

       

        if (slider && valueSpan) {

            slider.addEventListener('input', (event) => {

                valueSpan.textContent = event.target.value;

            });

            // 確保初始化時顯示滑桿預設值

            valueSpan.textContent = slider.value;

            console.log(`- 成功設置滑桿: ${sliderId}`);

        } else {

            console.error(`- 錯誤: 找不到滑桿元素 ID: ${sliderId} 或 ${valueId}，請檢查 index.html。`);

        }

    };

   

    setupSlider('height-slider', 'height-value');

    setupSlider('weight-slider', 'weight-value');



    const activityCards = document.querySelectorAll('#activity-level-container .activity-card');

    const activityFactorInput = document.getElementById('activity-factor');

   

    if (activityCards.length > 0 && activityFactorInput) {

        activityCards.forEach(card => {

            card.addEventListener('click', () => {

                activityCards.forEach(c => c.classList.remove('selected'));

                card.classList.add('selected');

                activityFactorInput.value = card.getAttribute('data-af');

            });

        });

        console.log("- 成功設置活動量卡片點擊事件。");

    } else {

        console.error("- 錯誤: 找不到活動量卡片或隱藏輸入框。");

    }



    const nextBtn = document.getElementById('next-to-survey-btn');

    if (nextBtn) {

        nextBtn.addEventListener('click', handleStage1Submission);

        console.log("- 成功綁定『下一步』按鈕事件。");

    } else {

        console.error("- 致命錯誤: 找不到『下一步』按鈕。");

    }

   

    // 🚨 修正：移除初始化時對 active-stage class 的操作。

    // 這些應該交給 index.html 初始狀態和 switchStage 函數處理。

}





// =======================================================

// H. 階段二：問卷渲染與收集邏輯 (最新的問卷文案)

// =======================================================

const questions = [

    { id: 'Q1', text: '蔬菜與纖維攝取\n您平均每天攝取幾份蔬菜？ (一份約為一拳頭煮熟蔬菜)', options: [

        { score: 1, label: 'A. 0-1 份' },

        { score: 2, label: 'B. 1-2 份' },

        { score: 3, label: 'C. 3-4 份' },

        { score: 4, label: 'D. 5 份以上' }

    ]},

    { id: 'Q2', text: '蛋白質攝取\n您的三餐中，有幾餐會攝取「一份手掌大小」的優質蛋白質？', options: [

        { score: 1, label: 'A. 0-1 餐' },

        { score: 2, label: 'B. 2 餐' },

        { score: 3, label: 'C. 3 餐' },

        { score: 4, label: 'D. 3 餐以上' }

    ]},

    { id: 'Q3', text: '水分攝取\n您每天平均飲用多少白開水？ (不包含含糖飲料、咖啡、茶)', options: [

        { score: 1, label: 'A. 1000 ml 以下' },

        { score: 2, label: 'B. 1000 - 1500 ml' },

        { score: 3, label: 'C. 1500 - 2500 ml' },

        { score: 4, label: 'D. 2500 ml 以上' }

    ]},

    { id: 'Q4', text: '精緻糖/油攝取\n您每週會飲用含糖飲料（手搖飲、汽水等）或吃甜點幾次？', options: [

        { score: 4, label: 'A. 0次' },

        { score: 3, label: 'B. 1-3次' },

        { score: 2, label: 'C. 4-6次' },

        { score: 1, label: 'D. 7次以上' }

    ]},

    { id: 'Q5', text: '飲食規律性\n您是否有三餐定時定量的習慣？', options: [

        { score: 1, label: 'A. 經常跳餐或不定時，每餐份量差異大。' },

        { score: 2, label: 'B. 偶爾跳餐或不定時，份量控制不佳。' },

        { score: 3, label: 'C. 幾乎定時用餐，但份量偶爾失控。' },

        { score: 4, label: 'D. 規律三餐，且盡量控制每餐份量。' }

    ]},

    { id: 'Q6', text: '睡眠時間\n您平均一天睡眠達到幾小時？', options: [

        { score: 1, label: 'A. 6 小時以下' },

        { score: 2, label: 'B. 6-7 小時' },

        { score: 3, label: 'C. 7-8 小時' },

        { score: 4, label: 'D. 8 小時以上' }

    ]},

];



function renderSurveyQuestions() {

    const stage2 = document.getElementById('stage-2');

   

    const surveyDescription = "請回答以下 6 個關於日常飲食和作息習慣的問題，有助於我更了解您。";



    stage2.innerHTML = `

        <h1>📝 習慣評估問卷</h1>

        <p>${surveyDescription}</p>

        <form id="survey-form">

            ${questions.map(q => {

                const parts = q.text.split('\n');

                const title = parts[0];

                const description = parts[1] || '';

               

                return `

                    <div class="question-card">

                        <h3>${title}</h3>

                        ${description ? `<p>${description}</p>` : ''}

                        <div class="options-container">

                            ${q.options.map(option => `

                                <label>

                                    <input type="radio" name="${q.id}" value="${option.score}" required>

                                    <span>${option.label}</span>

                                </label>

                            `).join('')}

                        </div>

                    </div>

                `;

            }).join('')}

           

            <button type="submit" id="submit-survey-btn">完成評估，生成個人報告</button>

        </form>

    `;

   

    document.getElementById('survey-form').addEventListener('submit', handleSurveySubmission);

}





// =======================================================

// I. 處理階段二提交邏輯 (處理問卷提交)

// =======================================================

function handleSurveySubmission(event) {

    event.preventDefault(); // 阻止表單預設提交行為

   

    const form = document.getElementById('survey-form');

    const formData = new FormData(form);

    const answers = {};

    let allAnswered = true;



    // 收集所有問題的答案

    questions.forEach(q => {

        const value = formData.get(q.id);

        if (!value) {

            allAnswered = false;

        }

        answers[q.id] = parseInt(value);

    });



    if (!allAnswered) {

        alert("請回答所有 6 個問題！");

        return;

    }

   

    // 執行計分和診斷

    const surveyResult = getSurveyResults(answers);



    // 整合所有數據

    const finalData = {

        ...userData,

        answers: answers,

        surveyScore: surveyResult.totalScore,

        diagnosis: surveyResult.diagnosis,

        timestamp: new Date().toISOString()

    };

   

    console.log("最終報告數據:", finalData);



    // 寫入 Firestore 並渲染報告

    submitFinalReport(finalData).then(success => {

        // 不論成功或失敗，都渲染並切換到報告頁面

        renderReport(finalData);

        switchStage(2, 3);

    });

}





// =======================================================

// J. 處理階段三渲染邏輯 (報告輸出 - 純文字模式)

// =======================================================

function renderReport(data) {

    const stage3 = document.getElementById('stage-3');

   

    // 診斷列表 HTML

    const diagnosisHtml = data.diagnosis.length > 0

        ? data.diagnosis.map(item => `<li>${item}</li>`).join('')

        : '<li>您的習慣非常良好，請繼續保持！若在飲食或體態上有其他需求，歡迎聯繫我！</li>';



    // 替換原有的 HTML 結構

    stage3.innerHTML = `

        <h1>🎉 個人化營養分析報告</h1>

        <span class="subtitle">Naomi營養師</span>

       

        <div id="report-summary">

            <h2>您的初步分析結果</h2>

            <p><strong>每日總熱量消耗 (TDEE)：</strong> <span class="report-metric">${data.tdee}</span> 大卡</p>

            <p><strong>基礎代謝率 (BMR)：</strong> <span class="report-metric">${data.bmr}</span> 大卡</p>

           

        </div>



        <h2>飲食與作息診斷</h2>

        <p>您的習慣評估總分為 ${data.surveyScore} / 24 分。</p>

        <p>以下是根據問卷結果，建議您需要調整的習慣：</p>

       

        <ul id="diagnosis-list">

            ${diagnosisHtml}

        </ul>



        <div id="call-to-action-section">

            <h3>📈 將數據化為行動力</h3>
            
            <p>我是 Naomi 營養師，數據只是開始，個性化的<strong>執行計畫</strong>才是關鍵。想讓努力更有方向嗎？別讓數據停在紙上！</p>
            
            <p>如果您已經準備好：</p>
            <ul>
                <li>透過具體戰略<strong>改善這些習慣</strong></li>
                <li>讓目標熱量<strong>精準落實</strong>到您的三餐中</li>
                <li>獲得<strong>量身打造的巨量營養素比例</strong></li>
                <li>擁有<strong>客製化菜單和一週飲食計畫</strong></li>
            </ul>
            
            <p class="action-prompt">🔥 <strong>立刻啟動您的專屬計畫！</strong></p>
            <form action="https://formspree.io/f/xvgeopaz" method="POST" id="contact-form">
    <input type="hidden" name="_redirect" value="false">
 
    <h3>留下你的聯絡資訊，或私訊我的ig🌿</h3>
 
    <label>姓名</label>
    <input type="text" name="name" required>
 
    <label>Line ID/手機號碼</label>
    <input type="text" name="Line ID/Phone" required>
 
    <label>想詢問的內容（選填）</label>
    <textarea name="message" rows="4"></textarea>
 
    <button type="submit">送出</button>
 
    <p id="form-status" style="margin-top:10px;color:#2b7a0b;"></p>
</form>
 
<script>
const form = document.querySelector("#contact-form");
const statusText = document.querySelector("#form-status");
 
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusText.textContent = "資料送出中…";
 
    const data = new FormData(form);
 
    const response = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { "Accept": "application/json" }
    });
 
    if (response.ok) {
        statusText.textContent = "已成功送出！我會盡快聯絡你 😊";
        form.reset();
    } else {
        statusText.textContent = "送出失敗，請稍後再試一次 🙏";
    }
});
</script>
 
<a href="https://instagram.com/naomiii_dietitian" target="_blank" class="instagram-link" style="...">
    前往我的 Instagram
</a>

        </div>

       

    `;

}





// =======================================================

// K. 應用程式啟動入口

// =======================================================

initializeStage1Interaction();
