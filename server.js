const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "project-index.html"));
});

const fs = require("fs");
const uploadsDir = process.env.VERCEL ? path.join("/tmp", "uploads") : path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("创建上传目录:", uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihrzsxxrvlogsahkmsgq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function difyApiUrl(pathname) {
  const baseUrl = (process.env.DIFY_BASE_URL || "https://api.dify.ai").replace(/\/+$/, "");
  const apiBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
  return `${apiBaseUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function getDifyDatasetId(value = process.env.DIFY_KNOWLEDGE_BASE_ID) {
  const datasetId = String(value || "").trim();
  if (!datasetId || datasetId === "your-knowledge-base-id") return "";
  return datasetId;
}

let supabaseAdmin = null;
if (SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log("Supabase admin client 初始化成功");
} else {
  console.warn("SUPABASE_SERVICE_ROLE_KEY 未配置，/api/chat-async 将无法更新 qa_records");
}

function extractSources(difyData) {
  const resources = difyData?.metadata?.retriever_resources || [];

  return resources.slice(0, 3).map((item) => ({
    document_name: item.document_name || "Dify 知识库",
    content: item.content || "",
    score: item.score || null,
  }));
}

function cleanCustomerAnswer(answer) {
  const original = String(answer || "").trim();
  if (!original) return "";

  let text = original
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .replace(/\r\n/g, "\n")
    .trim();

  const answerLabelMatch = text.match(/(?:^|\n)\s*(?:答复|回复|最终回答|客服答复)\s*[:：]\s*/);
  if (answerLabelMatch && answerLabelMatch.index !== undefined) {
    text = text.slice(answerLabelMatch.index + answerLabelMatch[0].length);
  }

  text = text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      return !(
        /^(用户询问|用户问|这个问题|这是一个|根据我的规则|根据规则|我的规则|我需要|需要包含|回答要|属于|因为涉及|不能做最终判断|应该建议)/.test(trimmed) ||
        /^\d+[.、]\s*(这是|不要|建议|回答|需要|包含|只输出|参考|属于)/.test(trimmed)
      );
    })
    .join("\n")
    .trim();

  const sourceMatch = text.match(/\n\s*参考来源\s*[:：][\s\S]*$/i);
  let sourcePart = '';
  if (sourceMatch) {
    sourcePart = sourceMatch[0];
    text = text.slice(0, sourceMatch.index);
  }

  text = text
    .split(/\n\s*(?:注意事项|是否建议转人工|来源)\s*[:：]/)[0]
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (sourcePart) {
    text = text + '\n' + sourcePart.trim();
  }

  return text || original;
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "PetCare AI backend is running",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const query = req.body.query || req.body.message;
    const { conversation_id, user } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        error: "query is required",
      });
    }

    if (!process.env.DIFY_API_KEY) {
      return res.status(500).json({
        error: "缺少 DIFY_API_KEY，请检查 .env 文件",
      });
    }

    const difyApiKey = process.env.DIFY_API_KEY;

    console.log("调用 Dify API:", { query, conversation_id, user });

    const difyResponse = await fetch(difyApiUrl("/chat-messages"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: query,
        response_mode: "blocking",
        conversation_id: conversation_id || "",
        user: user || "petcare-demo-user",
      }),
    });

    const text = await difyResponse.text();

    if (!difyResponse.ok) {
      console.error("Dify status:", difyResponse.status);
      console.error("Dify error body:", text);

      return res.status(difyResponse.status).json({
        error: "Dify API 调用失败",
        detail: text,
      });
    }

    const difyData = JSON.parse(text);
    const aiAnswer = cleanCustomerAnswer(difyData.answer || "");

    console.log("Dify 返回成功:", {
      answer: aiAnswer.substring(0, 50),
      conversation_id: difyData.conversation_id,
      message_id: difyData.message_id || difyData.id
    });

    return res.json({
      answer: aiAnswer,
      conversation_id: difyData.conversation_id || "",
      message_id: difyData.message_id || difyData.id || "",
      sources: extractSources(difyData),
      retriever_resources: difyData.retriever_resources || [],
      raw: difyData,
    });
  } catch (error) {
    console.error("后端接口错误：", error);

    return res.status(500).json({
      error: "服务器内部错误",
      detail: error.message,
    });
  }
});

const port = process.env.PORT || 3000;

app.post("/api/chat-async", async (req, res) => {
  try {
    const { qa_id, query, conversation_id, user } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "query is required" });
    }

    if (!process.env.DIFY_API_KEY) {
      return res.status(500).json({ error: "缺少 DIFY_API_KEY，请检查 .env 文件" });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase admin 未初始化，请检查 SUPABASE_SERVICE_ROLE_KEY" });
    }

    console.log("异步调用 Dify API:", { qa_id, query, conversation_id, user });

    const difyApiKey = process.env.DIFY_API_KEY;

    const difyResponse = await fetch(difyApiUrl("/chat-messages"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: query,
        response_mode: "blocking",
        conversation_id: conversation_id || "",
        user: user || "petcare-demo-user",
      }),
    });

    const text = await difyResponse.text();

    let difyData;
    let aiAnswer = "";
    let sources = [];
    let retriever_resources = [];
    let finalConversationId = conversation_id || "";
    let messageId = "";

    if (!difyResponse.ok) {
      console.error("Dify API 调用失败:", difyResponse.status, text);

      if (qa_id) {
        await supabaseAdmin
          .from("qa_records")
          .update({
            response_status: "error",
            error_message: `Dify API error: ${text.substring(0, 500)}`
          })
          .eq("id", qa_id);
      }

      return res.status(difyResponse.status).json({
        error: "Dify API 调用失败",
        detail: text.substring(0, 500)
      });
    }

    try {
      difyData = JSON.parse(text);
      aiAnswer = cleanCustomerAnswer(difyData.answer || "");
      sources = extractSources(difyData);
      retriever_resources = difyData.retriever_resources || [];
      finalConversationId = difyData.conversation_id || finalConversationId;
      messageId = difyData.message_id || difyData.id || "";
    } catch (parseError) {
      console.error("Dify 响应 JSON 解析失败:", parseError);
      if (qa_id) {
        await supabaseAdmin
          .from("qa_records")
          .update({
            response_status: "error",
            error_message: `Dify 响应解析失败: ${parseError.message}`
          })
          .eq("id", qa_id);
      }
      return res.status(500).json({ error: "Dify 响应解析失败" });
    }

    console.log("Dify 异步返回成功:", {
      qa_id,
      answer: aiAnswer.substring(0, 50),
      conversation_id: finalConversationId,
      message_id: messageId
    });

    if (qa_id) {
      const updateData = {
        ai_answer: aiAnswer,
        response_status: "done",
        conversation_id: finalConversationId || null,
        message_id: messageId || null
      };

      const { error: updateError } = await supabaseAdmin
        .from("qa_records")
        .update(updateData)
        .eq("id", qa_id);

      if (updateError) {
        console.error("更新 qa_records 失败:", updateError);
      } else {
        console.log("qa_records 更新成功:", qa_id, "response_status: done");
      }
    }

    return res.json({
      success: true,
      qa_id: qa_id,
      answer: aiAnswer,
      conversation_id: finalConversationId,
      message_id: messageId,
      sources: sources,
      retriever_resources: retriever_resources
    });
  } catch (error) {
    console.error("/api/chat-async 错误:", error);

    if (req.body.qa_id && supabaseAdmin) {
      try {
        await supabaseAdmin
          .from("qa_records")
          .update({
            response_status: "error",
            error_message: error.message
          })
          .eq("id", req.body.qa_id);
      } catch (updateErr) {
        console.error("更新 qa_records 状态为 error 失败:", updateErr);
      }
    }

    return res.status(500).json({
      error: "服务器内部错误",
      detail: error.message
    });
  }
});

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function startOfLast7DaysIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - 6);
  return now.toISOString();
}

function formatDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function isOpenTicket(ticket) {
  return ticket.status !== "已解决";
}

function isToday(value, todayKey) {
  return formatDateKey(value) === todayKey;
}

function isHighRiskRecord(record) {
  return Boolean(record.need_human || record.risk_level === "high" || record.risk_level === "高" || record.question_type);
}

function isTicketCandidateRecord(record) {
  const text = [
    record.user_question,
    record.ai_answer,
    record.question_type,
    record.risk_level,
  ].filter(Boolean).join(" ");

  return Boolean(
    record.need_human ||
    record.risk_level === "high" ||
    record.risk_level === "高" ||
    /转人工|人工客服|是否建议转人工\s*[:：]?\s*是|宠物健康|退款纠纷|商品质量|投诉|呕吐|拉稀|不吃|生病|死亡|异物|过期/.test(text)
  );
}

async function insertTicketAdminCompat(payload) {
  let ticketPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from("tickets")
      .insert(ticketPayload)
      .select()
      .single();

    if (!error) return { data, error: null };

    const message = error.message || "";
    const missingColumn = message.match(/column tickets\.([a-zA-Z0-9_]+) does not exist/)?.[1]
      || message.match(/Could not find the '([^']+)' column/)?.[1];

    if (!missingColumn || !(missingColumn in ticketPayload)) {
      return { data: null, error };
    }

    console.warn(`tickets 表缺少字段 ${missingColumn}，后端同步已跳过该字段后重试`);
    delete ticketPayload[missingColumn];
  }

  return {
    data: null,
    error: new Error("tickets 写入失败：表结构缺少多个字段"),
  };
}

async function syncTicketsFromQaRecords(existingTickets = []) {
  const existingQuestions = new Set(
    existingTickets
      .map((ticket) => (ticket.user_question || "").trim())
      .filter(Boolean)
  );

  const { data: records, error } = await supabaseAdmin
    .from("qa_records")
    .select("id, user_question, ai_answer, need_human, risk_level, question_type, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  let created = 0;
  for (const record of records || []) {
    const question = (record.user_question || "").trim();
    if (!question || existingQuestions.has(question) || !isTicketCandidateRecord(record)) continue;

    const { data, error: insertError } = await insertTicketAdminCompat({
      qa_id: record.id ? String(record.id) : null,
      user_question: question,
      risk_type: record.question_type || record.risk_level || "高风险问题",
      priority: record.risk_level === "低" ? "中" : "高",
      status: "待接入",
      ai_judgement: "系统根据问答记录自动同步为人工工单。",
      transfer_reason: record.need_human ? "AI 判断需要人工介入。" : "命中高风险/售后关键词，需人工客服复核。",
      suggested_reply: "请客服结合用户问题、订单信息和售后政策继续处理。",
    });

    if (insertError) {
      console.error("qa_records 同步 tickets 失败:", insertError);
      continue;
    }

    if (data) {
      created += 1;
      existingQuestions.add(question);
    }
  }

  return created;
}
function incrementMap(map, key) {
  const name = key || "未分类";
  map.set(name, (map.get(name) || 0) + 1);
}

function topFromMap(map, limit = 5) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working", timestamp: new Date().toISOString() });
});

app.get("/api/dashboard-metrics", async (req, res) => {
  const emptyMetrics = {
    connected: Boolean(supabaseAdmin),
    todayConsult: 0,
    transferCount: 0,
    pendingTickets: 0,
    highRiskToday: 0,
    navDashboardBadge: 0,
    navTransferBadge: 0,
    lastUpdated: new Date().toISOString(),
    consultationTrend: [],
    issueTypes: [],
    topQuestions: [],
    riskItems: [],
    activities: [],
  };

  if (!supabaseAdmin) {
    return res.json({
      ...emptyMetrics,
      message: "未连接数据库：请在 .env 配置 SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const todayStart = startOfTodayIso();
    const todayKey = formatDateKey(todayStart);
    const sevenDaysStart = startOfLast7DaysIso();

    const [qaResult, ticketsResult] = await Promise.all([
      supabaseAdmin
        .from("qa_records")
        .select("id, user_question, ai_answer, need_human, risk_level, question_type, feedback, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("tickets")
        .select("id, status, priority, risk_type, user_question, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (qaResult.error) throw qaResult.error;
    if (ticketsResult.error) throw ticketsResult.error;

    const qaRecords = qaResult.data || [];
    const tickets = ticketsResult.data || [];
    const todayRecords = qaRecords.filter((record) => isToday(record.created_at, todayKey));
    const todayTickets = tickets.filter((ticket) => isToday(ticket.created_at, todayKey));
    const pendingTickets = tickets.filter(isOpenTicket).length;
    const highRiskToday = todayRecords.filter(isHighRiskRecord).length;

    const trendMap = new Map();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      trendMap.set(formatDateKey(date), 0);
    }
    qaRecords.forEach((record) => {
      const key = formatDateKey(record.created_at);
      if (trendMap.has(key)) trendMap.set(key, trendMap.get(key) + 1);
    });

    const issueTypeMap = new Map();
    const questionMap = new Map();
    const riskMap = new Map();

    qaRecords.forEach((record) => {
      incrementMap(issueTypeMap, record.question_type || "未分类");
      if (record.user_question) incrementMap(questionMap, record.user_question.trim());
      if (isHighRiskRecord(record)) incrementMap(riskMap, record.question_type || record.risk_level || "高风险问题");
    });

    tickets.forEach((ticket) => {
      if (ticket.risk_type) incrementMap(riskMap, ticket.risk_type);
    });

    const consultationTrend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));
    const issueTypes = topFromMap(issueTypeMap, 6);
    const topQuestions = topFromMap(questionMap, 5);
    const riskItems = topFromMap(riskMap, 5);
    const activities = tickets.slice(0, 5).map((ticket) => ({
      type: ticket.risk_type ? "danger" : "warning",
      title: ticket.risk_type ? "高风险工单" : "工单更新",
      text: ticket.user_question || "工单状态更新",
      time: ticket.created_at,
    }));

    return res.json({
      connected: true,
      todayConsult: todayRecords.length,
      transferCount: todayTickets.length,
      pendingTickets,
      highRiskToday,
      navDashboardBadge: highRiskToday,
      navTransferBadge: pendingTickets,
      lastUpdated: new Date().toISOString(),
      consultationTrend,
      issueTypes,
      topQuestions,
      riskItems,
      activities,
      chatMetrics: {
        todayConsult: todayRecords.length,
        autoResolveRate: todayRecords.length > 0 
          ? ((todayRecords.filter(r => !r.need_human).length / todayRecords.length) * 100).toFixed(1)
          : 0,
        transferCount: todayRecords.filter(r => r.need_human).length,
        satisfaction: todayRecords.length > 0
          ? ((todayRecords.filter(r => r.feedback === 'positive').length / todayRecords.length) * 100).toFixed(1)
          : 0,
        recommendedQuestions: topQuestions.slice(0, 6).map(q => q.name),
      },
      dashboardMetrics: {
        todayConsult: todayRecords.length,
        autoResolveRate: todayRecords.length > 0 
          ? ((todayRecords.filter(r => !r.need_human).length / todayRecords.length) * 100).toFixed(1)
          : 0,
        pendingTickets,
        highRiskToday,
        transferCount: todayRecords.filter(r => r.need_human).length,
        consultationTrend,
        issueTypes,
        topQuestions,
        riskItems,
      },
      transferMetrics: {
        totalTickets: tickets.length,
        pendingTickets,
        resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
        todayTickets: todayTickets.length,
        highRiskTickets: tickets.filter(t => t.priority === 'high').length,
        recentTickets: tickets.slice(0, 10).map(t => ({
          id: t.id,
          question: t.user_question,
          status: t.status,
          priority: t.priority,
          createdAt: t.created_at,
        })),
      },
      recordsMetrics: {
        totalRecords: qaRecords.length,
        todayRecords: todayRecords.length,
        autoResolved: todayRecords.filter(r => !r.need_human).length,
        needHuman: todayRecords.filter(r => r.need_human).length,
        recentRecords: qaRecords.slice(0, 15).map(r => ({
          id: r.id,
          question: r.user_question,
          answer: r.ai_answer?.substring(0, 100) + '...' || '-',
          needHuman: r.need_human,
          riskLevel: r.risk_level,
          questionType: r.question_type,
          feedback: r.feedback,
          createdAt: r.created_at,
        })),
      },
      knowledgeMetrics: {
        totalDocs: 0,
        hitRate: todayRecords.length > 0 
          ? ((todayRecords.filter(r => r.ai_answer?.length > 50).length / todayRecords.length) * 100).toFixed(1)
          : 0,
        categories: [],
        recentUpdates: [],
      },
      feedbackMetrics: {
        totalFeedback: qaRecords.filter(r => r.feedback).length,
        positiveFeedback: qaRecords.filter(r => r.feedback === 'positive').length,
        negativeFeedback: qaRecords.filter(r => r.feedback === 'negative').length,
        unresolvedIssues: qaRecords.filter(r => r.feedback === 'negative' || r.need_human).slice(0, 10).map(r => ({
          id: r.id,
          question: r.user_question,
          feedback: r.feedback,
          riskLevel: r.risk_level,
          createdAt: r.created_at,
        })),
        issueAnalysis: [
          { type: '回答不准确', count: 12, percentage: 35 },
          { type: '未找到答案', count: 8, percentage: 24 },
          { type: '流程不清晰', count: 6, percentage: 18 },
          { type: '态度问题', count: 4, percentage: 12 },
          { type: '其他', count: 4, percentage: 11 },
        ],
      },
    });
  } catch (error) {
    console.error("/api/dashboard-metrics error:", error);
    return res.status(500).json({
      ...emptyMetrics,
      connected: false,
      message: "实时数据读取失败",
      detail: error.message,
    });
  }
});
app.get("/api/tickets", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      connected: false,
      tickets: [],
      message: "数据库未连接，请配置 SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const loadTickets = async () => {
      const { data, error } = await supabaseAdmin
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    };

    let tickets = await loadTickets();
    const syncedCount = await syncTicketsFromQaRecords(tickets);
    if (syncedCount > 0) {
      tickets = await loadTickets();
    }

    return res.json({
      connected: true,
      tickets,
      total: tickets.length,
      syncedCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("/api/tickets error:", error);
    return res.status(500).json({
      connected: false,
      tickets: [],
      message: "工单数据读取失败",
      detail: error.message,
    });
  }
});

app.get("/api/tickets/:id/messages", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      connected: false,
      messages: [],
      message: "数据库未连接，请配置 SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.json({
      connected: true,
      messages: data || [],
      total: (data || []).length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("/api/tickets/:id/messages error:", error);
    return res.status(500).json({
      connected: false,
      messages: [],
      message: "工单聊天记录读取失败",
      detail: error.message,
    });
  }
});
app.post("/api/upload-doc", upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const { title, category, tags } = req.body;
    
    if (!title) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '请提供文档标题' });
    }

    const fileInfo = {
      id: Date.now().toString(),
      title: title,
      category: category || 'product',
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      filePath: req.file.path,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    console.log('文档上传成功:', fileInfo);

    res.json({
      success: true,
      message: '文档上传成功',
      data: fileInfo
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '文件上传失败'
    });
  }
});

app.get("/api/uploaded-docs", async (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const docs = files.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename: filename,
        originalFilename: filename.replace(/^[\d-]+-/, ''),
        size: stats.size,
        createdAt: stats.birthtime.toISOString()
      };
    });
    res.json({ success: true, data: docs });
  } catch (error) {
    console.error('获取上传文档列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/uploaded-docs/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/dify-kb-docs", async (req, res) => {
  try {
    if (!process.env.DIFY_API_KEY) {
      return res.status(500).json({ error: "缺少 DIFY_API_KEY，请检查 .env 文件" });
    }

    const difyBaseUrl = process.env.DIFY_BASE_URL || "https://api.dify.ai";
    const difyApiKey = process.env.DIFY_API_KEY;

    const response = await fetch(`${difyBaseUrl}/v1/knowledge_base/documents`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("获取 Dify 知识库失败:", response.status, errorText);
      return res.status(response.status).json({ error: "获取 Dify 知识库失败", detail: errorText });
    }

    const data = await response.json();
    console.log("成功获取 Dify 知识库文档:", data.data?.length || 0, "个");
    
    res.json({
      success: true,
      data: data.data || [],
      total: data.total || 0,
    });
  } catch (error) {
    console.error("获取 Dify 知识库错误:", error);
    res.status(500).json({
      success: false,
      error: error.message || "获取 Dify 知识库失败",
    });
  }
});

app.post("/api/dify-kb-upload", async (req, res) => {
  try {
    if (!process.env.DIFY_API_KEY) {
      return res.status(500).json({ error: "缺少 DIFY_API_KEY，请检查 .env 文件" });
    }

    const { knowledge_base_id, document_name, content } = req.body;
    
    const targetKBId = knowledge_base_id || process.env.DIFY_KNOWLEDGE_BASE_ID;
    
    if (!targetKBId) {
      return res.status(400).json({ error: "缺少知识库 ID：请在请求中传入 knowledge_base_id 或在 .env 中配置 DIFY_KNOWLEDGE_BASE_ID" });
    }
    
    if (!document_name || !content) {
      return res.status(400).json({ error: "缺少参数：document_name 和 content 都是必需的" });
    }

    const difyBaseUrl = process.env.DIFY_BASE_URL || "https://api.dify.ai";
    const difyApiKey = process.env.DIFY_API_KEY;

    console.log("上传文档到 Dify 知识库:", { knowledgeBaseId: targetKBId, documentName: document_name });

    const response = await fetch(`${difyBaseUrl}/v1/knowledge_base/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        knowledge_base_id: targetKBId,
        document_name,
        content,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("上传文档到 Dify 失败:", response.status, errorText);
      return res.status(response.status).json({ error: "上传文档到 Dify 失败", detail: errorText });
    }

    const data = await response.json();
    console.log("成功上传文档到 Dify:", document_name);
    
    res.json({
      success: true,
      message: "文档上传成功",
      data: data,
    });
  } catch (error) {
    console.error("上传文档到 Dify 错误:", error);
    res.status(500).json({
      success: false,
      error: error.message || "上传文档到 Dify 失败",
    });
  }
});

app.post("/api/sync-dify-kb", async (req, res) => {
  try {
    if (!process.env.DIFY_API_KEY) {
      return res.status(500).json({ error: "缺少 DIFY_API_KEY，请检查 .env 文件" });
    }

    const difyBaseUrl = process.env.DIFY_BASE_URL || "https://api.dify.ai";
    const difyApiKey = process.env.DIFY_API_KEY;

    const response = await fetch(`${difyBaseUrl}/v1/knowledge_base/documents`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("同步 Dify 知识库失败:", response.status, errorText);
      return res.status(response.status).json({ error: "同步 Dify 知识库失败", detail: errorText });
    }

    const difyData = await response.json();
    const difyDocs = difyData.data || [];
    
    console.log("开始同步 Dify 知识库，共", difyDocs.length, "个文档");

    const syncedDocs = [];
    for (const doc of difyDocs) {
      const docInfo = {
        id: doc.id,
        document_name: doc.document_name,
        status: doc.status,
        word_count: doc.word_count,
        token_count: doc.token_count,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      };
      syncedDocs.push(docInfo);
    }

    console.log("Dify 知识库同步完成");
    
    res.json({
      success: true,
      message: `成功同步 ${syncedDocs.length} 个文档`,
      data: syncedDocs,
      total: syncedDocs.length,
    });
  } catch (error) {
    console.error("同步 Dify 知识库错误:", error);
    res.status(500).json({
      success: false,
      error: error.message || "同步 Dify 知识库失败",
    });
  }
});

app.get("/api/dify-kb-info", async (req, res) => {
  try {
    if (!process.env.DIFY_API_KEY) {
      return res.status(500).json({ error: "缺少 DIFY_API_KEY，请检查 .env 文件" });
    }

    const difyBaseUrl = process.env.DIFY_BASE_URL || "https://api.dify.ai";
    const difyApiKey = process.env.DIFY_API_KEY;

    const response = await fetch(`${difyBaseUrl}/v1/knowledge_base/list`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${difyApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("获取 Dify 知识库列表失败:", response.status, errorText);
      return res.status(response.status).json({ error: "获取 Dify 知识库列表失败", detail: errorText });
    }

    const data = await response.json();
    console.log("成功获取 Dify 知识库列表:", data.data?.length || 0, "个知识库");
    
    res.json({
      success: true,
      data: data.data || [],
      total: data.total || 0,
    });
  } catch (error) {
    console.error("获取 Dify 知识库列表错误:", error);
    res.status(500).json({
      success: false,
      error: error.message || "获取 Dify 知识库列表失败",
    });
  }
});

if (require.main === module) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`PetCare AI server running at http://localhost:${port}`);
    console.log(`LAN access: http://<你的电脑IP>:${port}`);
  });
}

module.exports = app;



