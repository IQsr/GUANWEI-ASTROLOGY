import { LEGAL, LEGAL_VERSION } from '@/lib/legal';

/**
 * 條款同私隱政策嘅正文（2026-09-29 初稿）
 *
 * 私隱政策由 docs/privacy.md（規格）寫成讀者睇得明嘅版本：收乜、點解、擺喺邊、幾時刪、
 * 第三方、你嘅權利。改規格嗰陣要一齊改呢度，改咗實質內容就要改 `LEGAL_VERSION`。
 *
 * ⚠ 唔係法律意見。〔方括號〕係未定嘅值（`LEGAL.placeholder`），上線前要填同搵人睇。
 */
export type Section = { h: string; p: string[] };
export type LegalDoc = { title: string; updated: string; sections: Section[] };

const zhDate = LEGAL_VERSION.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`);

const ZH_TERMS: LegalDoc = {
  title: '使用條款',
  updated: `最後更新：${zhDate}`,
  sections: [
    { h: '一、這是甚麼服務', p: [`星敘（下稱「我們」，由${LEGAL.operator}營運）根據你提供的出生資料排出紫微斗數命盤，並寫成一本命書。部分章節免費閱讀，其餘深讀章節需要付款解鎖。`] },
    { h: '二、命書的性質', p: ['命書依據紫微斗數古籍與流派寫成，是一種文化與自我理解的參考讀物，不是對未來的保證或預測。', '命書不是醫療、心理、法律、投資、財務或其他專業意見。涉及健康、金錢、關係或法律的重要決定，請由你自己判斷，需要時請諮詢相關專業人士。'] },
    { h: '三、你提供的資料', p: ['你要確保填寫的出生資料正確；資料不準，排出的盤也會不準。', '如果你替別人排盤，請先取得對方同意。出生資料屬於對方的個人資料。'] },
    { h: '四、已完成的書不會自行改動', p: ['一本命書完成後，內容就固定下來，不會因為我們日後更新內容或規則而改變。想用新版內容，可以用同一組生辰再排一本。'] },
    { h: '五、帳戶與保存', p: ['你不用註冊也可以排盤。未認領的書只由這部瀏覽器認得，清除瀏覽器資料、換機或換瀏覽器就可能找不回來。', '認領（留下電郵）之後，書會記在該電郵名下。'] },
    { h: '六、付款與退款', p: ['付款由 Stripe 處理，我們看不到你的卡號。價錢會在付款頁清楚列明，付款一次即解鎖整本書的深讀章節。', `如需退款，請於付款後〔退款期限〕內聯絡 ${LEGAL.contact}。退款後，該書的深讀章節會重新鎖上。`] },
    { h: '七、知識產權', p: ['命書文字由我們撰寫，你可以自由作個人閱讀、保存及分享給親友；未經同意，請勿作商業用途或大量轉載。引用的古籍原文屬公有領域，現代著作只引用簡短句子並註明出處。'] },
    { h: '八、責任限制', p: ['在法律許可的範圍內，我們不就你根據命書內容作出的決定所帶來的任何損失負責。我們會盡力保持服務正常運作，但不保證服務永不中斷或完全沒有錯誤。'] },
    { h: '九、終止與刪除', p: ['你可以隨時在「設定」中永久刪除你的資料和帳戶。我們亦可能暫停或終止明顯濫用服務的帳戶。'] },
    { h: '十、條款更新', p: ['條款有實質改動時，我們會更新本頁日期，並在你下次起盤前請你再次確認。'] },
    { h: '十一、適用法律與聯絡', p: [`本條款受${LEGAL.governingLaw}管轄。如有任何問題，請聯絡 ${LEGAL.contact}。`] },
  ],
};

const ZH_PRIVACY: LegalDoc = {
  title: '私隱政策',
  updated: `最後更新：${zhDate}`,
  sections: [
    { h: '一、我們是誰', p: [`星敘由${LEGAL.operator}營運，是你資料的控制者。聯絡：${LEGAL.contact}。`] },
    { h: '二、我們收集甚麼', p: [
      '出生資料：出生日期、時辰、出生地（經緯度）和性別，用來排盤。',
      '姓名：印在命書封面，可以留空。',
      '命盤和命書內容：由出生資料算出和寫成。命盤本身也能推回部分出生資料，所以我們把它當作出生資料一樣保護。',
      '電郵：只有在你認領書本時才收集。',
      '付款紀錄：付款編號、金額、時間。卡號由 Stripe 處理，我們看不到。',
      '同意紀錄：你同意了哪個版本的條款及私隱政策、在甚麼時候。',
      '溯時（從過往經歷推算時辰的試驗，自願參加）：只有在你剔選同意時，才記下你選的大概時段、每條問題的答案、我們猜的時辰和你真正的時辰。這份記錄不包含你的名字、電郵、生日或書，也不會連到你的帳戶。',
    ] },
    { h: '三、為甚麼收集', p: ['排盤、寫成並保存你要的命書（履行你和我們之間的服務合約）。', '付款紀錄按會計及稅務法律要求保存。', '溯時的記錄用來檢驗和改進我們從過往經歷推算時辰的方法（基於你的同意）；不同意也可以照樣玩。', '我們不會出售你的資料，不會用來賣廣告，也不會用來建立行銷檔案。'] },
    { h: '四、Cookie 和本機儲存', p: [
      '我們只使用兩個必要的 cookie：NEXT_LOCALE（記住語言）和 Supabase 的登入 cookie（認得你的書）。沒有廣告或追蹤 cookie。',
      '瀏覽器本機另外記住幾樣方便你的設定：日讀／夜讀、上次讀到哪裡、你是否已同意本條款、哪幾本書做過溯時。這些資料只留在你的裝置上。',
    ] },
    { h: '五、第三方', p: [
      `Supabase：存放資料庫和處理登入，資料存放於${'〔資料庫所在地區〕'}。`,
      'Google Fonts：載入字體時，你的瀏覽器會把 IP 位址傳給 Google。',
      'Stripe：處理付款。Stripe 會收到你的付款資料和電郵，並可能把資料傳送到你所在地區以外。',
      '除此之外，你的瀏覽器不會直接與其他第三方交換資料。',
    ] },
    { h: '六、保存多久', p: ['出生資料、命盤、命書和電郵會保存到你刪除為止。', '溯時的記錄不連到你，所以刪除帳戶時不會一併刪除；它本身不能認出你是誰。', '付款的會計紀錄會按法律要求的年期保存，但在你刪除帳戶後，這些紀錄不再連結到你。'] },
    { h: '七、你的權利', p: [
      '匯出：在「設定」下載你的全部資料。',
      '刪除：在「設定」永久刪除你的資料和帳戶，是真正刪除，不是隱藏。',
      '更正：用正確的生辰重新排一本新書。',
      `如有疑問或投訴，請聯絡 ${LEGAL.contact}，你亦可以向你所在地的資料保護監管機構投訴。`,
    ] },
    { h: '八、未成年人', p: ['如果你未滿十八歲，請在家長或監護人同意下使用本服務。'] },
    { h: '九、政策更新', p: ['私隱政策有實質改動時，我們會更新本頁日期，並在你下次起盤前請你再次確認。'] },
  ],
};

const EN_TERMS: LegalDoc = {
  title: 'Terms of Use',
  updated: `Last updated: ${LEGAL_VERSION}`,
  sections: [
    { h: '1. The service', p: [`Stellogue ("we", operated by ${LEGAL.operator}) casts a Zi Wei Dou Shu chart from the birth details you give and writes it into a book. Some chapters are free; the in-depth chapters are unlocked by payment.`] },
    { h: '2. What the book is', p: ['The book is a reading based on classical Zi Wei Dou Shu texts and schools. It is a cultural and self-reflection resource, not a guarantee or prediction of the future.', 'It is not medical, psychological, legal, investment, financial or other professional advice. Important decisions about health, money, relationships or the law are yours to make; consult a qualified professional where appropriate.'] },
    { h: '3. The details you provide', p: ['You are responsible for the accuracy of the birth details you enter; inaccurate details give an inaccurate chart.', 'If you cast a chart for someone else, get their consent first — their birth details are their personal data.'] },
    { h: '4. Finished books do not change', p: ['Once a book is written it is fixed; later updates to our content or rules do not change it. To get the newer content, cast a new book from the same birth details.'] },
    { h: '5. Accounts and storage', p: ['You can cast without signing up. An unclaimed book is recognised only by this browser; clearing browser data or switching devices may lose it.', 'Once you claim your books with an email address, they are kept under that address.'] },
    { h: '6. Payment and refunds', p: ['Payments are handled by Stripe; we never see your card number. The price is shown clearly on the payment page, and one payment unlocks all in-depth chapters of that book.', `For a refund, contact ${LEGAL.contact} within 〔refund window〕 of payment. After a refund, that book's in-depth chapters are locked again.`] },
    { h: '7. Intellectual property', p: ['We write the text of your book. You may read, keep and share it with friends and family for personal use; please do not use it commercially or republish it at scale without permission. Quoted classical texts are in the public domain; modern works are quoted only briefly and cited.'] },
    { h: '8. Limitation of liability', p: ['To the extent permitted by law, we are not liable for losses arising from decisions you make based on your book. We aim to keep the service running but do not guarantee it will be uninterrupted or error-free.'] },
    { h: '9. Termination and deletion', p: ['You can permanently delete your data and account at any time in Settings. We may suspend or end accounts that clearly abuse the service.'] },
    { h: '10. Changes to these terms', p: ['When these terms change materially, we update the date on this page and ask you to confirm again before your next chart.'] },
    { h: '11. Governing law and contact', p: [`These terms are governed by ${LEGAL.governingLaw}. Questions: ${LEGAL.contact}.`] },
  ],
};

const EN_PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  updated: `Last updated: ${LEGAL_VERSION}`,
  sections: [
    { h: '1. Who we are', p: [`Stellogue is operated by ${LEGAL.operator}, the controller of your data. Contact: ${LEGAL.contact}.`] },
    { h: '2. What we collect', p: [
      'Birth details: date, hour, place of birth (coordinates) and sex, used to cast your chart.',
      'Name: printed on the cover of your book; you may leave it blank.',
      'Chart and book content, derived from your birth details. A chart can partly reveal the birth details behind it, so we protect it the same way.',
      'Email: collected only when you claim your books.',
      'Payment records: payment ID, amount and time. Card details are handled by Stripe; we never see them.',
      'Consent record: which version of these terms and policy you agreed to, and when.',
      'Trace the Hour (an optional trial of inferring your birth hour from past events): only if you tick to agree, we record the rough time band you chose, your answer to each question, the hour we guessed and your actual hour. The record contains no name, email, birth date or book, and is not linked to your account.',
    ] },
    { h: '3. Why we collect it', p: ['To cast, write and keep the book you asked for (performing our contract with you).', 'Payment records are kept as accounting and tax law requires.', 'Trace the Hour records are used to test and improve our method of inferring a birth hour from past events (based on your consent); you can play without agreeing.', 'We do not sell your data, use it for advertising, or build marketing profiles.'] },
    { h: '4. Cookies and local storage', p: ['We use only two strictly necessary cookies: NEXT_LOCALE (your language) and the Supabase sign-in cookie (recognising your books). No advertising or tracking cookies.', 'Your browser also stores a few conveniences locally: light/dark reading, where you last read, whether you have agreed to these terms, and which books have done Trace the Hour. These stay on your device.'] },
    { h: '5. Third parties', p: [
      'Supabase: hosts our database and sign-in; data is stored in 〔database region〕.',
      'Google Fonts: when fonts load, your browser sends your IP address to Google.',
      'Stripe: processes payments. Stripe receives your payment details and email and may transfer data outside your region.',
      'Otherwise your browser does not exchange data directly with any other third party.',
    ] },
    { h: '6. How long we keep it', p: ['Birth details, charts, books and email are kept until you delete them.', 'Trace the Hour records are not linked to you, so they are not deleted with your account; on their own they cannot identify you.', 'Accounting records of payments are kept for the period the law requires, but are no longer linked to you once you delete your account.'] },
    { h: '7. Your rights', p: ['Export: download all your data in Settings.', 'Delete: permanently delete your data and account in Settings — a real deletion, not hiding.', 'Correct: cast a new book with the correct birth details.', `Questions or complaints: ${LEGAL.contact}. You may also complain to the data protection authority where you live.`] },
    { h: '8. Minors', p: ['If you are under 18, please use the service with the consent of a parent or guardian.'] },
    { h: '9. Changes to this policy', p: ['When this policy changes materially, we update the date on this page and ask you to confirm again before your next chart.'] },
  ],
};

export function legalDoc(kind: 'terms' | 'privacy', locale: string): LegalDoc {
  const en = locale === 'en';
  if (kind === 'terms') return en ? EN_TERMS : ZH_TERMS;
  return en ? EN_PRIVACY : ZH_PRIVACY;
}
