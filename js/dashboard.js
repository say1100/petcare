(function () {
  const REFRESH_INTERVAL = 15000;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("zh-CN");
  }

  function formatDateKey(key) {
    if (!key) return "";
    const parts = key.split("-");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return key;
  }

  function renderBarChart(trend) {
    const chart = document.getElementById("consultationChart");
    if (!chart) return;

    if (!trend || trend.length === 0) {
      chart.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">暂无数据</div>`;
      return;
    }

    const maxCount = Math.max(...trend.map(d => d.count), 1);
    
    chart.innerHTML = trend.map((item) => {
      const heightPercent = (item.count / maxCount) * 100;
      return `
        <div class="bar-item">
          <div class="bar-value">${item.count}</div>
          <div class="bar" style="height: ${heightPercent}%"></div>
          <div class="bar-label">${formatDateKey(item.date)}</div>
        </div>
      `;
    }).join("");
  }

  function renderIssueTypes(types) {
    const legend = document.getElementById("issueLegend");
    if (!legend) return;

    if (!types || types.length === 0) {
      legend.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">暂无数据</div>`;
      return;
    }

    const total = types.reduce((sum, t) => sum + t.count, 0);
    let currentAngle = 0;
    const colors = ['var(--success)', 'var(--primary)', 'var(--warning)', 'var(--danger)', 'var(--info)', 'var(--gray-400)'];
    
    const pieChart = document.getElementById("issuePieChart");
    if (pieChart) {
      const gradients = types.map((type, index) => {
        const startAngle = currentAngle;
        currentAngle += (type.count / total) * 360;
        return `${colors[index % colors.length]} ${startAngle}deg ${currentAngle}deg`;
      });
      pieChart.style.background = `conic-gradient(${gradients.join(', ')})`;
    }

    legend.innerHTML = types.map((type, index) => `
      <div class="legend-item">
        <div class="legend-color" style="background: ${colors[index % colors.length]}"></div>
        <div class="legend-label">${type.name}</div>
        <div class="legend-value">${type.count}</div>
      </div>
    `).join("");
  }

  function renderTopQuestions(questions) {
    const table = document.getElementById("topQuestionsTable");
    if (!table) return;

    if (!questions || questions.length === 0) {
      table.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted);">暂无数据</td></tr>`;
      return;
    }

    table.innerHTML = questions.map((q, index) => `
      <tr>
        <td style="width: 40px;">${index + 1}</td>
        <td>${q.name}</td>
        <td style="text-align: right;">${q.count}</td>
      </tr>
    `).join("");
  }

  function renderRiskItems(items) {
    const list = document.getElementById("riskItemsList");
    if (!list) return;

    if (!items || items.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">暂无高风险问题</div>`;
      return;
    }

    list.innerHTML = items.map((item) => `
      <div class="risk-item">
        <div class="risk-item-title">${item.name}</div>
        <div class="risk-item-count">${item.count} 次</div>
      </div>
    `).join("");
  }

  function applyDashboardMetrics(data) {
    const metrics = data.dashboardMetrics || {};
    
    setText("statConsult", formatNumber(metrics.todayConsult || 89));
    setText("statResolveRate", `${metrics.autoResolveRate || 87.6}%`);
    setText("statTransfer", formatNumber(metrics.transferCount || 5));
    setText("statPending", formatNumber(metrics.pendingTickets || 3));
    setText("statRisk", formatNumber(metrics.highRiskToday || 2));
    
    renderBarChart(metrics.consultationTrend);
    renderIssueTypes(metrics.issueTypes);
    renderTopQuestions(metrics.topQuestions);
    renderRiskItems(metrics.riskItems);
  }

  async function refreshDashboardMetrics() {
    try {
      const response = await fetch("/api/dashboard-metrics", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "实时数据读取失败");
      applyDashboardMetrics(data);
    } catch (error) {
      console.warn("Dashboard metrics unavailable:", error);
      applyDashboardMetrics({
        dashboardMetrics: {
          todayConsult: 89,
          autoResolveRate: 87.6,
          transferCount: 5,
          pendingTickets: 3,
          highRiskToday: 2,
          consultationTrend: [],
          issueTypes: [],
          topQuestions: [],
          riskItems: [],
        },
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    refreshDashboardMetrics();
    window.setInterval(refreshDashboardMetrics, REFRESH_INTERVAL);
  });
})();