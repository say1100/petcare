(function () {
  const REFRESH_INTERVAL = 15000;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function updateFilterCountsWithDefault() {
    const mockTickets = [
      { id: 'T00001', status: '待接入', priority: '中', user_question: '示例工单' },
    ];

    const pending = mockTickets.filter(t => t.status === '待接入').length;
    const processing = mockTickets.filter(t => t.status === '处理中').length;
    const resolved = mockTickets.filter(t => t.status === '已解决').length;
    const highRisk = mockTickets.filter(t => t.priority === '高' && t.status !== '已解决').length;

    setText("statTotal", mockTickets.length.toString());
    setText("statPending", pending.toString());
    setText("statProcessing", processing.toString());
    setText("statResolved", resolved.toString());

    setText("count-all", (pending + processing).toString());
    setText("count-pending", pending.toString());
    setText("count-processing", processing.toString());
    setText("count-resolved", resolved.toString());
    setText("count-high", highRisk.toString());
  }

  async function refreshTransferMetrics() {
    try {
      const response = await fetch("/api/dashboard-metrics", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "实时数据读取失败");
      
      const metrics = data.transferMetrics || {};
      const tickets = metrics.recentTickets || [];
      
      const pending = tickets.filter(t => t.status === '待接入' || t.status === 'pending').length;
      const processing = tickets.filter(t => t.status === '处理中' || t.status === 'processing').length;
      const resolved = tickets.filter(t => t.status === '已解决' || t.status === 'resolved').length;
      const highRisk = tickets.filter(t => (t.priority === '高' || t.priority === 'high') && 
        !(t.status === '已解决' || t.status === 'resolved')).length;

      setText("statTotal", tickets.length.toString());
      setText("statPending", pending.toString());
      setText("statProcessing", processing.toString());
      setText("statResolved", resolved.toString());

      setText("count-all", (pending + processing).toString());
      setText("count-pending", pending.toString());
      setText("count-processing", processing.toString());
      setText("count-resolved", resolved.toString());
      setText("count-high", highRisk.toString());
    } catch (error) {
      console.warn("Transfer metrics unavailable, using default data:", error);
      updateFilterCountsWithDefault();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      const countAll = document.getElementById('count-all');
      if (countAll && countAll.textContent === '0') {
        refreshTransferMetrics();
      }
    }, 1000);
    
    window.setInterval(refreshTransferMetrics, REFRESH_INTERVAL);
  });
})();