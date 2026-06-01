(function () {
  const REFRESH_INTERVAL = 5000;
  const DISPLAY_TIME_ZONE = "Asia/Shanghai";

  let allRecords = [];
  let activeFilter = "all";
  let searchKeyword = "";
  let refreshTimer = null;
  let recordsSubscription = null;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("zh-CN");
  }

  function formatRelativeTime(value) {
    if (!value) return "刚刚";

    const time = parseRecordDate(value).getTime();
    if (Number.isNaN(time)) return "-";

    const diff = Date.now() - time;
    const minutes = Math.max(0, Math.floor(diff / 60000));
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;

    return `${Math.floor(hours / 24)} 天前`;
  }

  function parseRecordDate(value) {
    if (!value) return new Date(NaN);
    if (value instanceof Date) return value;

    const text = String(value);
    const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(text);
    return new Date(hasTimeZone ? text : `${text}Z`);
  }

  function formatRecordTime(value) {
    if (!value) return "-";

    const date = parseRecordDate(value);
    if (Number.isNaN(date.getTime())) return "-";

    const parts = new Intl.DateTimeFormat("zh-CN", {
      timeZone: DISPLAY_TIME_ZONE,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);

    const getPart = (type) => parts.find((part) => part.type === type)?.value || "00";
    const month = getPart("month");
    const day = getPart("day");
    const hours = getPart("hour");
    const minutes = getPart("minute");
    return `${month}/${day} ${hours}:${minutes}`;
  }

  function formatDateKey(value) {
    const date = value ? parseRecordDate(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";

    const parts = new Intl.DateTimeFormat("zh-CN", {
      timeZone: DISPLAY_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);

    const getPart = (type) => parts.find((part) => part.type === type)?.value || "";
    return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cleanAnswerText(value) {
    return String(value || "-")
      .replace(/<\/?think>/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isResolved(record) {
    return Boolean(
      (record.feedback === "positive" ||
        record.response_status === "done" ||
        record.ai_answer) &&
      !record.need_human
    );
  }

  function isRisky(record) {
    return Boolean(
      record.need_human ||
      record.risk_level === "high" ||
      record.risk_level === "高"
    );
  }

  function getRecordStatus(record) {
    if (record.need_human && isResolved(record)) return { text: "人工已解决", className: "resolved" };
    if (record.need_human) return { text: "人工处理中", className: "transferred" };
    if (record.response_status === "error" || record.feedback === "negative") return { text: "未解决", className: "risk" };
    if (isResolved(record)) return { text: "AI已解决", className: "resolved" };
    if (record.response_status === "generating") return { text: "生成中", className: "pending" };
    return { text: "未反馈", className: "pending" };
  }

  function matchesActiveFilter(record) {
    switch (activeFilter) {
      case "resolved":
        return isResolved(record);
      case "pending":
        return !isResolved(record) && !record.need_human;
      case "transferred":
        return Boolean(record.need_human);
      case "risky":
        return isRisky(record);
      case "negative":
        return record.feedback === "negative";
      case "all":
      default:
        return true;
    }
  }

  function getFilteredRecords() {
    return allRecords.filter((record) => {
      if (!matchesActiveFilter(record)) return false;
      if (!searchKeyword) return true;

      const content = [
        record.user_question,
        record.ai_answer,
        record.question_type,
        record.risk_level,
        record.feedback,
        record.response_status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(searchKeyword);
    });
  }

  function renderRecords(records) {
    const tableBody = document.getElementById("recordList");
    if (!tableBody) return;

    if (!records || records.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">
            暂无问答记录
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = records
      .map((record) => {
        const status = getRecordStatus(record);
        const answer = cleanAnswerText(record.ai_answer || record.answer || "-");
        const answerText = answer.length > 105 ? `${answer.substring(0, 105)}...` : answer;
        const sourceText = record.source || record.knowledge_source || "Dify 知识库";

        return `
          <tr>
            <td class="record-question-cell">
              <span class="record-question-text">${escapeHtml(record.user_question || record.question || "-")}</span>
              <span class="record-type">${escapeHtml(record.question_type || "-")}</span>
            </td>
            <td class="record-answer-cell">
              <span class="record-answer-text">${escapeHtml(answerText)}</span>
              <span class="record-answer-source">${escapeHtml(sourceText)}</span>
            </td>
            <td>
              <span class="status-badge ${status.className}">${status.text}</span>
            </td>
            <td>
              <span class="record-time">${formatRecordTime(record.created_at)}</span>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderFilteredRecords() {
    const filteredRecords = getFilteredRecords();
    setText("recordCount", formatNumber(filteredRecords.length));
    renderRecords(filteredRecords);
  }

  function applyRecordsMetrics(records) {
    allRecords = Array.isArray(records) ? records : [];
    const todayKey = formatDateKey();

    setText("totalRecordsCount", formatNumber(allRecords.length));
    setText(
      "todayRecordsCount",
      formatNumber(allRecords.filter((record) => formatDateKey(record.created_at) === todayKey).length)
    );
    setText("autoResolvedCount", formatNumber(allRecords.filter(isResolved).length));
    setText("needHumanCount", formatNumber(allRecords.filter((record) => record.need_human).length));

    renderFilteredRecords();
  }

  async function refreshRecordsMetrics() {
    if (!window.supabaseClient) {
      console.error("Supabase client 未初始化");
      applyRecordsMetrics([]);
      return;
    }

    try {
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

  function setupRealtimeSubscription() {
    if (!window.supabaseClient || recordsSubscription) return;

    recordsSubscription = window.supabaseClient
      .channel("records-page-qa-records")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_records" },
        () => {
          refreshRecordsMetrics();
        }
      )
      .subscribe((status) => {
        console.log("qa_records 实时订阅状态:", status);
      });
  }

  window.filterRecords = function filterRecords(filter) {
    activeFilter = filter || "all";

    document.querySelectorAll(".filter-tab").forEach((tab) => {
      const isActive = tab.getAttribute("onclick") === `filterRecords('${activeFilter}')`;
      tab.classList.toggle("active", isActive);
    });

    renderFilteredRecords();
  };

  window.searchRecords = function searchRecords() {
    const input = document.getElementById("searchInput");
    searchKeyword = (input?.value || "").trim().toLowerCase();
    renderFilteredRecords();
  };

  function initRecordsPage() {
    refreshRecordsMetrics();
    setupRealtimeSubscription();

    if (window.testSupabaseConnection && window.supabaseClient) {
      setTimeout(window.testSupabaseConnection, 100);
    }

    if (!refreshTimer) {
      refreshTimer = window.setInterval(refreshRecordsMetrics, REFRESH_INTERVAL);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRecordsPage);
  } else {
    initRecordsPage();
  }
})();
