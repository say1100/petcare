(function () {
  const REFRESH_INTERVAL = 15000;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("zh-CN");
  }

  function formatTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getFeedbackType(record) {
    if (record.feedback === '有帮助' || record.feedback === '好评' || record.feedback === 'positive') {
      return 'positive';
    }
    if (record.feedback === '没帮助' || record.feedback === '差评' || record.feedback === 'negative') {
      return 'negative';
    }
    return 'neutral';
  }

  function getAttribution(record) {
    if (record.need_human === true) {
      return '需要人工处理';
    }
    if (record.risk_level === '高') {
      return '高风险场景';
    }
    if (!record.source_doc || record.source_doc === '') {
      return '知识库缺失';
    }
    if (record.feedback === '没帮助' || record.feedback === '差评') {
      return '回答不完整';
    }
    return '无明显问题';
  }

  function renderFeedbackTable(feedbacks, qaRecords) {
    const tbody = document.getElementById('feedbackTableBody');
    if (!tbody) return;

    const mergedData = feedbacks.map(feedback => {
      const qaRecord = qaRecords.find(q => q.id === feedback.qa_record_id) || {};
      return { ...qaRecord, ...feedback };
    });

    const negativeFeedbacks = mergedData.filter(r =>
      r.feedback === '没帮助' || r.feedback === '差评' || r.feedback === 'negative' || r.need_human === true
    );

    if (negativeFeedbacks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">暂无负面反馈数据</td></tr>';
      return;
    }

    tbody.innerHTML = negativeFeedbacks.map(item => {
      const type = getFeedbackType(item);
      const attribution = getAttribution(item);
      const source = item.need_human ? '转人工中心' : '智能客服';

      return `
        <tr>
          <td>${formatTime(item.created_at)}</td>
          <td>${source}</td>
          <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.user_question || '-'}</td>
          <td>${item.ai_answer ? item.ai_answer.substring(0, 20) + '...' : '-'}</td>
          <td><span class="tag tag-${type}">${type === 'positive' ? '正向' : type === 'neutral' ? '中性' : '负向'}</span></td>
          <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${attribution}</td>
          <td><span class="priority-tag ${item.risk_level === '高' ? 'high' : item.risk_level === '中' ? 'medium' : 'low'}">${item.risk_level === '高' ? '高' : item.risk_level === '中' ? '中' : '低'}</span></td>
          <td><span class="status-tag pending">待处理</span></td>
        </tr>
      `;
    }).join('');
  }

  function updateStats(feedbacks, qaRecords) {
    const mergedData = feedbacks.map(feedback => {
      const qaRecord = qaRecords.find(q => q.id === feedback.qa_record_id) || {};
      return { ...qaRecord, ...feedback };
    });

    const total = mergedData.length;
    const positive = mergedData.filter(r => getFeedbackType(r) === 'positive').length;
    const neutral = mergedData.filter(r => getFeedbackType(r) === 'neutral').length;
    const negative = mergedData.filter(r => getFeedbackType(r) === 'negative').length;

    setText('statTotalFeedback', total);
    setText('statPositiveRate', total > 0 ? `${Math.round((positive / total) * 100)}%` : '0%');
    setText('statNegativeRate', total > 0 ? `${Math.round((negative / total) * 100)}%` : '0%');
    setText('statPendingIssues', negative);

    setText('positiveCount', positive);
    setText('neutralCount', neutral);
    setText('negativeCount', negative);

    if (total > 0) {
      const positiveBar = document.getElementById('positiveBar');
      const neutralBar = document.getElementById('neutralBar');
      const negativeBar = document.getElementById('negativeBar');
      if (positiveBar) positiveBar.style.width = `${(positive / total) * 100}%`;
      if (neutralBar) neutralBar.style.width = `${(neutral / total) * 100}%`;
      if (negativeBar) negativeBar.style.width = `${(negative / total) * 100}%`;

      setText('positivePercent', `${Math.round((positive / total) * 100)}%`);
      setText('neutralPercent', `${Math.round((neutral / total) * 100)}%`);
      setText('negativePercent', `${Math.round((negative / total) * 100)}%`);
    }
  }

  async function refreshFeedbackMetrics() {
    try {
      const response = await fetch("/api/dashboard-metrics", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "实时数据读取失败");
      
      const feedbacks = data.feedbackMetrics?.feedbacks || [];
      const qaRecords = data.feedbackMetrics?.qaRecords || [];
      
      updateStats(feedbacks, qaRecords);
      renderFeedbackTable(feedbacks, qaRecords);
    } catch (error) {
      console.warn("Feedback metrics unavailable:", error);
      
      const defaultFeedbacks = [
        { id: '1', feedback: 'positive', created_at: new Date().toISOString(), user_question: '猫粮多久喂一次', ai_answer: '建议每天分两次喂食', need_human: false, risk_level: '低' },
        { id: '2', feedback: 'positive', created_at: new Date(Date.now() - 300000).toISOString(), user_question: '如何选择狗粮', ai_answer: '根据年龄和体型选择', need_human: false, risk_level: '低' },
        { id: '3', feedback: 'neutral', created_at: new Date(Date.now() - 600000).toISOString(), user_question: '退货政策是什么', ai_answer: '支持7天无理由退货', need_human: false, risk_level: '低' },
        { id: '4', feedback: 'negative', created_at: new Date(Date.now() - 900000).toISOString(), user_question: '物流信息查询', ai_answer: '请提供订单号', need_human: true, risk_level: '高' },
      ];
      
      updateStats(defaultFeedbacks, []);
      renderFeedbackTable(defaultFeedbacks, []);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    refreshFeedbackMetrics();
    window.setInterval(refreshFeedbackMetrics, REFRESH_INTERVAL);
  });
})();