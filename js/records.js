(function () {
  const REFRESH_INTERVAL = 15000;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("zh-CN");
  }

  function formatRelativeTime(value) {
    if (!value) return "刚刚";
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.max(0, Math.floor(diff / 60000));
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  }

  function getFeedbackIcon(feedback) {
    switch (feedback) {
      case 'positive': return 'positive';
      case 'negative': return 'negative';
      default: return 'neutral';
    }
  }

  function getRiskLevelClass(riskLevel) {
    switch (riskLevel) {
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      case 'low': return 'risk-low';
      default: return '';
    }
  }

  function getRiskLevelText(riskLevel) {
    switch (riskLevel) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '-';
    }
  }

  function renderRecords(records) {
    const tableBody = document.getElementById("recordList");
    if (!tableBody) return;

    if (!records || records.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">暂无问答记录，请先在智能客服页发起咨询</td></tr>`;
      return;
    }

    tableBody.innerHTML = records.map((record) => {
      let statusText = '未反馈';
      let statusClass = 'pending';
      
      if (record.need_human) {
        statusText = '已转人工';
        statusClass = 'transferred';
      } else if (record.feedback === 'positive') {
        statusText = '已解决';
        statusClass = 'resolved';
      } else if (record.feedback === 'negative') {
        statusText = '未解决';
        statusClass = 'risk';
      }

      const answerText = record.ai_answer?.length > 50 ? record.ai_answer.substring(0, 50) + '...' : record.ai_answer || '-';
      
      return `
      <tr>
        <td class="record-question-cell">
          <span class="record-question-text">${record.user_question || '-'}</span>
          <span class="record-type">${record.question_type || '-'}</span>
        </td>
        <td class="record-answer-cell">
          <span class="record-answer-text">${answerText}</span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td>
          <span class="record-time">${formatRelativeTime(record.created_at)}</span>
        </td>
      </tr>
    `;
    }).join("");
  }

  function applyRecordsMetrics(records) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalRecords = records.length;
    const todayRecords = records.filter(r => new Date(r.created_at) >= todayStart).length;
    const autoResolved = records.filter(r => r.feedback === 'positive').length;
    const needHuman = records.filter(r => r.need_human).length;
    
    setText("totalRecordsCount", formatNumber(totalRecords));
    setText("todayRecordsCount", formatNumber(todayRecords));
    setText("autoResolvedCount", formatNumber(autoResolved));
    setText("needHumanCount", formatNumber(needHuman));
    setText("recordCount", formatNumber(totalRecords));
    
    renderRecords(records);
  }

  async function refreshRecordsMetrics() {
    console.log("=== Supabase 连接检测 ===");
    console.log("Supabase URL 是否存在:", !!window.SUPABASE_URL);
    console.log("Supabase Key 是否存在:", !!window.SUPABASE_ANON_KEY);
    console.log("Supabase client 初始化状态:", !!window.supabaseClient);

    if (!window.supabaseClient) {
      console.error("错误: Supabase client 未初始化");
      applyRecordsMetrics([]);
      return;
    }

    try {
      console.log("正在查询问答记录...");
      
      const { data, error } = await window.supabaseClient
        .from("qa_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("查询问答记录失败:", error);
        applyRecordsMetrics([]);
        return;
      }

      console.log("查询问答记录成功，共", data?.length || 0, "条");
      applyRecordsMetrics(data || []);
    } catch (error) {
      console.error("查询问答记录异常:", error);
      applyRecordsMetrics([]);
    }
  }

  // 等待 DOM 加载完成后再执行
  document.addEventListener("DOMContentLoaded", () => {
    // 立即执行一次
    refreshRecordsMetrics();
    
    // 如果 client 已经初始化成功，立即调用测试函数
    if (window.testSupabaseConnection && window.supabaseClient) {
      setTimeout(window.testSupabaseConnection, 100);
    }
    
    // 设置定时刷新
    window.setInterval(refreshRecordsMetrics, REFRESH_INTERVAL);
  });
})();
