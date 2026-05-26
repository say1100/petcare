(function () {
  const REFRESH_INTERVAL = 15000;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setBadge(id, value) {
    const node = document.getElementById(id);
    if (!node) return;
    const number = Number(value || 0);
    node.textContent = number > 99 ? "99+" : String(number);
    node.hidden = number <= 0;
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

  function renderActivities(activities) {
    const list = document.getElementById("realtimeActivityList");
    if (!list) return;

    if (!activities || activities.length === 0) {
      list.innerHTML = `
        <li class="activity-item">
          <div class="activity-icon info"></div>
          <div class="activity-content">
            <div class="activity-text"><strong>暂无真实动态</strong> 数据库连接后将自动展示最新工单</div>
            <div class="activity-time">实时刷新中</div>
          </div>
        </li>
      `;
      return;
    }

    list.innerHTML = activities.map((item) => `
      <li class="activity-item">
        <div class="activity-icon ${item.type || "info"}"></div>
        <div class="activity-content">
          <div class="activity-text"><strong>${item.title || "最新动态"}</strong> ${item.text || "-"}</div>
          <div class="activity-time">${formatRelativeTime(item.time)}</div>
        </div>
      </li>
    `).join("");
  }

  function applyMetrics(data) {
    setText("statTodayConsult", formatNumber(data.todayConsult));
    setText("statAutoResolve", `${Number(data.autoResolveRate || 0)}%`);
    setText("statPendingTickets", formatNumber(data.pendingTickets));
    setText("statHighRisk", formatNumber(data.highRiskToday));
    setText("trendTodayConsult", data.connected ? "实时" : "未连接");
    setText("trendAutoResolve", data.connected ? "实时" : "未连接");
    setText("trendPendingTickets", data.connected ? "实时" : "未连接");
    setText("trendHighRisk", data.connected ? "实时" : "未连接");
    setText("pendingTicketStatusText", `${Number(data.pendingTickets || 0)} 个待处理工单`);
    setText("todayConsultStatusText", `今日 ${Number(data.todayConsult || 0)} 次咨询`);
    setText("todayConsultStatusTag", data.connected ? "实时" : "未连接");
    setBadge("navDashboardBadge", data.navDashboardBadge);
    setBadge("navTransferBadge", data.navTransferBadge);
    renderActivities(data.activities);
  }

  async function refreshDashboardMetrics() {
    try {
      const response = await fetch("/api/dashboard-metrics", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "实时数据读取失败");
      applyMetrics(data);
    } catch (error) {
      console.warn("Dashboard metrics unavailable:", error);
      applyMetrics({
        connected: false,
        todayConsult: 0,
        autoResolveRate: 0,
        pendingTickets: 0,
        highRiskToday: 0,
        navDashboardBadge: 0,
        navTransferBadge: 0,
        activities: [],
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    refreshDashboardMetrics();
    window.setInterval(refreshDashboardMetrics, REFRESH_INTERVAL);
  });
})();