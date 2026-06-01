(function () {
  const REFRESH_INTERVAL = 15000;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("zh-CN");
  }

  function renderRecommendedQuestions(questions) {
    const list = document.getElementById("quickQuestionList");
    if (!list) return;

    let validQuestions = [];
    try {
      validQuestions = questions && Array.isArray(questions) && questions.length > 0 
        ? questions.filter(q => q && typeof q === 'string' && q.trim().length > 0)
        : [];
    } catch (e) {
      console.error('Error filtering questions:', e);
      validQuestions = [];
    }

    if (validQuestions.length === 0) {
      list.innerHTML = `
        <div class="quick-question-item" onclick="askQuestion('这款猫粮适合多大的猫？')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          这款猫粮适合多大的猫？
        </div>
        <div class="quick-question-item" onclick="askQuestion('订单什么时候发货？')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          订单什么时候发货？
        </div>
        <div class="quick-question-item" onclick="askQuestion('如何申请退款？')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          如何申请退款？
        </div>
        <div class="quick-question-item" onclick="askQuestion('会员有什么优惠？')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          会员有什么优惠？
        </div>
      `;
      return;
    }

    try {
      list.innerHTML = validQuestions.map((question) => {
        const escapedQuestion = question.replace(/'/g, "\\'").replace(/"/g, '\\"');
        return `
          <div class="quick-question-item" onclick="askQuestion('${escapedQuestion}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            ${question}
          </div>
        `;
      }).join("");
    } catch (e) {
      console.error('Error rendering questions:', e);
      list.innerHTML = `
        <div class="quick-question-item" onclick="askQuestion('这款猫粮适合多大的猫？')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          这款猫粮适合多大的猫？
        </div>
      `;
    }
  }

  function updateStatusTag(isConnected) {
    const statusTag = document.getElementById("aiServiceStatus");
    if (!statusTag) return;

    if (isConnected) {
      statusTag.className = "status-tag status-tag-success";
      statusTag.innerHTML = '<span class="status-dot-sm"></span>AI 服务正常';
    } else {
      statusTag.className = "status-tag status-tag-danger";
      statusTag.innerHTML = '<span class="status-dot-sm"></span>服务未连接';
    }
  }

  function applyChatMetrics(data) {
    const metrics = data.chatMetrics || {};
    
    setText("chatStatConsult", formatNumber(metrics.todayConsult || 0));
    setText("chatStatAutoResolve", `${metrics.autoResolveRate || 0}%`);
    setText("chatStatTransfer", formatNumber(metrics.transferCount || 0));
    setText("chatStatSatisfaction", `${metrics.satisfaction || 0}%`);
    
    updateStatusTag(data.connected);
  }

  const defaultQuestions = [
    '这款猫粮适合多大的猫？',
    '订单什么时候发货？',
    '如何申请退款？',
    '会员有什么优惠？',
    '可以退货吗？'
  ];

  async function refreshChatMetrics() {
    try {
      const response = await fetch("/api/dashboard-metrics", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "实时数据读取失败");
      applyChatMetrics(data);
    } catch (error) {
      console.warn("Chat metrics unavailable, using fallback data:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    refreshChatMetrics().catch(console.error);
  });
})();
