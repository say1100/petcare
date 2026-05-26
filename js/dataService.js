const DataService = {
    STORAGE_KEYS: {
        QA_RECORDS: 'petcare_qa_records',
        TICKETS: 'petcare_tickets',
        KNOWLEDGE_DOCS: 'petcare_knowledge_docs',
        FEEDBACK_RECORDS: 'petcare_feedback_records'
    },

    init() {
        if (!localStorage.getItem(this.STORAGE_KEYS.QA_RECORDS)) {
            localStorage.setItem(this.STORAGE_KEYS.QA_RECORDS, JSON.stringify(this.getDefaultQARecords()));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.TICKETS)) {
            localStorage.setItem(this.STORAGE_KEYS.TICKETS, JSON.stringify(this.getDefaultTickets()));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.KNOWLEDGE_DOCS)) {
            localStorage.setItem(this.STORAGE_KEYS.KNOWLEDGE_DOCS, JSON.stringify(this.getDefaultKnowledgeDocs()));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.FEEDBACK_RECORDS)) {
            localStorage.setItem(this.STORAGE_KEYS.FEEDBACK_RECORDS, JSON.stringify(this.getDefaultFeedbackRecords()));
        }
    },

    getDefaultQARecords() {
        return [
            {
                id: 'qa_001',
                sessionId: 'sess_001',
                userId: 'user_001',
                userType: 'customer',
                question: '这款猫粮适合3个月的小猫吗？',
                answer: '您好！这款猫粮适合6个月以上的成年猫。对于3个月的小猫，我们推荐您选择我们的幼猫专用奶糕，配方更细腻，易于消化吸收。',
                sources: ['商品说明-幼猫奶糕', '宠物喂养指南'],
                isRisky: false,
                riskType: null,
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                status: 'resolved'
            },
            {
                id: 'qa_002',
                sessionId: 'sess_002',
                userId: 'user_002',
                userType: 'customer',
                question: '猫咪吃完这个罐头一直呕吐怎么办？',
                answer: '您好，猫咪持续呕吐可能涉及健康风险，建议您尽快咨询宠物医生。',
                sources: ['人工客服转接规则-宠物健康风险'],
                isRisky: true,
                riskType: 'pet_health',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                status: 'transferred'
            },
            {
                id: 'qa_003',
                sessionId: 'sess_003',
                userId: 'user_003',
                userType: 'customer',
                question: '订单什么时候发货？',
                answer: '您好！您的订单已付款，我们将在24小时内发货。预计送达时间为3-5天。快递公司为顺丰速运，您可以随时在APP查看物流进度。',
                sources: ['物流规则-发货时间', '物流规则-快递公司'],
                isRisky: false,
                riskType: null,
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                status: 'resolved'
            },
            {
                id: 'qa_004',
                sessionId: 'sess_004',
                userId: 'user_004',
                userType: 'customer',
                question: '我申请退款已经7天了还没到账',
                answer: '您好，给您带来不便非常抱歉。我来帮您查询一下退款进度。',
                sources: ['售后政策-退款流程'],
                isRisky: true,
                riskType: 'refund_dispute',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                status: 'transferred'
            },
            {
                id: 'qa_005',
                sessionId: 'sess_005',
                userId: 'user_005',
                userType: 'customer',
                question: '优惠券可以叠加使用吗？',
                answer: '您好！关于我们平台的优惠券规则：1. 新用户礼包优惠券可与其他优惠叠加；2. 会员专属优惠券每位会员每月限用2张；3. 限时秒杀活动不可与优惠券叠加使用。建议您在结算页面查看具体可用优惠。',
                sources: ['优惠券与会员规则'],
                isRisky: false,
                riskType: null,
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                status: 'resolved'
            }
        ];
    },

    getDefaultTickets() {
        return [
            {
                id: 'tkt_001',
                qaRecordId: 'qa_002',
                userId: 'user_002',
                userQuestion: '猫咪吃完这个罐头一直呕吐怎么办？',
                riskTags: ['pet_health'],
                priority: 'high',
                aiReason: '涉及宠物健康风险，AI不应进行疾病诊断',
                status: 'pending',
                createdAt: new Date(Date.now() - 1800000).toISOString(),
                assignedTo: null,
                resolvedAt: null,
                notes: ''
            },
            {
                id: 'tkt_002',
                qaRecordId: 'qa_004',
                userId: 'user_004',
                userQuestion: '我申请退款已经7天了还没到账',
                riskTags: ['refund_dispute'],
                priority: 'high',
                aiReason: '用户情绪激动，涉及退款纠纷',
                status: 'processing',
                createdAt: new Date(Date.now() - 900000).toISOString(),
                assignedTo: '客服小王',
                resolvedAt: null,
                notes: '正在核查退款流水'
            },
            {
                id: 'tkt_003',
                qaRecordId: null,
                userId: 'user_006',
                userQuestion: '购买的狗粮里有异物',
                riskTags: ['product_quality'],
                priority: 'medium',
                aiReason: '涉及商品质量问题，需要人工核查',
                status: 'pending',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                assignedTo: null,
                resolvedAt: null,
                notes: ''
            },
            {
                id: 'tkt_004',
                qaRecordId: null,
                userId: 'user_007',
                userQuestion: '物流显示已签收但我没收到货',
                riskTags: ['logistics'],
                priority: 'medium',
                aiReason: '涉及物流异常，需要人工核查订单',
                status: 'resolved',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                assignedTo: '客服小李',
                resolvedAt: new Date(Date.now() - 43200000).toISOString(),
                notes: '已联系快递公司核实，客户已签收'
            }
        ];
    },

    getDefaultKnowledgeDocs() {
        return [
            {
                id: 'doc_001',
                category: 'product',
                title: '商品说明-猫粮系列',
                content: '成猫猫粮：适用于6个月以上成年猫，含有丰富蛋白质和牛磺酸...',
                tags: ['猫粮', '成猫', '蛋白质'],
                createdAt: '2024-01-15',
                updatedAt: '2024-03-20',
                status: 'published',
                viewCount: 1256
            },
            {
                id: 'doc_002',
                category: 'product',
                title: '商品说明-幼猫奶糕',
                content: '幼猫奶糕：适用于2-6个月幼猫，配方细腻易消化...',
                tags: ['猫粮', '幼猫', '奶糕'],
                createdAt: '2024-01-15',
                updatedAt: '2024-03-20',
                status: 'published',
                viewCount: 892
            },
            {
                id: 'doc_003',
                category: 'after_sales',
                title: '售后政策-退换货规则',
                content: '1. 商品签收后7天内可申请退换货；2. 食品类商品需未拆封...',
                tags: ['退货', '换货', '售后'],
                createdAt: '2024-02-01',
                updatedAt: '2024-03-15',
                status: 'published',
                viewCount: 2341
            },
            {
                id: 'doc_004',
                category: 'after_sales',
                title: '售后政策-退款流程',
                content: '退款申请审核通过后，退款将在1-7个工作日内原路返回...',
                tags: ['退款', '退款流程'],
                createdAt: '2024-02-01',
                updatedAt: '2024-03-15',
                status: 'published',
                viewCount: 1876
            },
            {
                id: 'doc_005',
                category: 'faq',
                title: '常见问题-如何使用优惠券',
                content: '1. 领取优惠券后，在结算页面选择可用优惠券；2. 部分优惠券有门槛要求...',
                tags: ['优惠券', '使用规则'],
                createdAt: '2024-02-10',
                updatedAt: '2024-03-18',
                status: 'published',
                viewCount: 3421
            },
            {
                id: 'doc_006',
                category: 'logistics',
                title: '物流规则-发货与配送',
                content: '订单付款后24小时内发货，全国大部分地区3-5天送达...',
                tags: ['物流', '发货', '配送'],
                createdAt: '2024-02-15',
                updatedAt: '2024-03-10',
                status: 'published',
                viewCount: 1567
            },
            {
                id: 'doc_007',
                category: 'transfer',
                title: '人工客服转接规则',
                content: '以下情况需要转人工：1. 宠物健康风险问题；2. 退款纠纷超过500元...',
                tags: ['转人工', '高风险'],
                createdAt: '2024-03-01',
                updatedAt: '2024-03-25',
                status: 'published',
                viewCount: 876
            },
            {
                id: 'doc_008',
                category: 'guidelines',
                title: '客服话术规范',
                content: '开场白：您好，我是PetCare智能客服，请问有什么可以帮助您？...',
                tags: ['话术', '规范'],
                createdAt: '2024-03-01',
                updatedAt: '2024-03-20',
                status: 'published',
                viewCount: 654
            }
        ];
    },

    getDefaultFeedbackRecords() {
        return [
            {
                id: 'fb_001',
                qaRecordId: 'qa_001',
                rating: 5,
                comment: '回答很专业，推荐的幼猫奶糕很合适',
                type: 'positive',
                createdAt: new Date(Date.now() - 3000000).toISOString()
            },
            {
                id: 'fb_002',
                qaRecordId: 'qa_003',
                rating: 4,
                comment: '回答及时，但想知道的快递单号没给',
                type: 'neutral',
                createdAt: new Date(Date.now() - 7000000).toISOString()
            },
            {
                id: 'fb_003',
                qaRecordId: 'qa_005',
                rating: 5,
                comment: '优惠券规则讲得很清楚',
                type: 'positive',
                createdAt: new Date(Date.now() - 80000000).toISOString()
            },
            {
                id: 'fb_004',
                qaRecordId: null,
                rating: 2,
                comment: '机器人答非所问，转人工等太久',
                type: 'negative',
                createdAt: new Date(Date.now() - 100000000).toISOString()
            }
        ];
    },

    getQARecords() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.QA_RECORDS) || '[]');
    },

    addQARecord(record) {
        const records = this.getQARecords();
        const newRecord = {
            id: 'qa_' + Date.now(),
            sessionId: record.sessionId || 'sess_' + Date.now(),
            userId: record.userId || 'user_' + Math.random().toString(36).substr(2, 9),
            userType: record.userType || 'customer',
            question: record.question,
            answer: record.answer || '',
            sources: record.sources || [],
            isRisky: record.isRisky || false,
            riskType: record.riskType || null,
            timestamp: new Date().toISOString(),
            status: record.status || 'pending'
        };
        records.unshift(newRecord);
        localStorage.setItem(this.STORAGE_KEYS.QA_RECORDS, JSON.stringify(records));
        return newRecord;
    },

    updateQARecord(id, updates) {
        const records = this.getQARecords();
        const index = records.findIndex(r => r.id === id);
        if (index !== -1) {
            records[index] = { ...records[index], ...updates };
            localStorage.setItem(this.STORAGE_KEYS.QA_RECORDS, JSON.stringify(records));
            return records[index];
        }
        return null;
    },

    getTickets() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TICKETS) || '[]');
    },

    addTicket(ticket) {
        const tickets = this.getTickets();
        const newTicket = {
            id: 'tkt_' + Date.now(),
            qaRecordId: ticket.qaRecordId || null,
            userId: ticket.userId || 'user_' + Math.random().toString(36).substr(2, 9),
            userQuestion: ticket.userQuestion,
            riskTags: ticket.riskTags || [],
            priority: ticket.priority || 'medium',
            aiReason: ticket.aiReason || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            assignedTo: null,
            resolvedAt: null,
            notes: ''
        };
        tickets.unshift(newTicket);
        localStorage.setItem(this.STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
        return newTicket;
    },

    updateTicket(id, updates) {
        const tickets = this.getTickets();
        const index = tickets.findIndex(t => t.id === id);
        if (index !== -1) {
            tickets[index] = { ...tickets[index], ...updates };
            localStorage.setItem(this.STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
            return tickets[index];
        }
        return null;
    },

    getKnowledgeDocs() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.KNOWLEDGE_DOCS) || '[]');
    },

    addKnowledgeDoc(doc) {
        const docs = this.getKnowledgeDocs();
        const newDoc = {
            id: 'doc_' + Date.now(),
            category: doc.category || 'product',
            title: doc.title,
            content: doc.content || '',
            tags: doc.tags || [],
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            status: 'draft',
            viewCount: 0
        };
        docs.push(newDoc);
        localStorage.setItem(this.STORAGE_KEYS.KNOWLEDGE_DOCS, JSON.stringify(docs));
        return newDoc;
    },

    updateKnowledgeDoc(id, updates) {
        const docs = this.getKnowledgeDocs();
        const index = docs.findIndex(d => d.id === id);
        if (index !== -1) {
            docs[index] = { 
                ...docs[index], 
                ...updates, 
                updatedAt: new Date().toISOString().split('T')[0] 
            };
            localStorage.setItem(this.STORAGE_KEYS.KNOWLEDGE_DOCS, JSON.stringify(docs));
            return docs[index];
        }
        return null;
    },

    deleteKnowledgeDoc(id) {
        const docs = this.getKnowledgeDocs();
        const filtered = docs.filter(d => d.id !== id);
        localStorage.setItem(this.STORAGE_KEYS.KNOWLEDGE_DOCS, JSON.stringify(filtered));
    },

    getFeedbackRecords() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.FEEDBACK_RECORDS) || '[]');
    },

    addFeedbackRecord(record) {
        const records = this.getFeedbackRecords();
        const newRecord = {
            id: 'fb_' + Date.now(),
            qaRecordId: record.qaRecordId || null,
            rating: record.rating || 3,
            comment: record.comment || '',
            type: record.rating >= 4 ? 'positive' : record.rating >= 3 ? 'neutral' : 'negative',
            createdAt: new Date().toISOString()
        };
        records.unshift(newRecord);
        localStorage.setItem(this.STORAGE_KEYS.FEEDBACK_RECORDS, JSON.stringify(records));
        return newRecord;
    },

    getStatistics() {
        const qaRecords = this.getQARecords();
        const tickets = this.getTickets();
        const feedback = this.getFeedbackRecords();
        const knowledgeDocs = this.getKnowledgeDocs();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayQARecords = qaRecords.filter(r => new Date(r.timestamp) >= today);
        const pendingTickets = tickets.filter(t => t.status === 'pending');
        const resolvedToday = tickets.filter(t => t.status === 'resolved' && new Date(t.resolvedAt) >= today);

        const positiveFeedback = feedback.filter(f => f.type === 'positive').length;
        const totalFeedback = feedback.length;
        const satisfactionRate = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 0;

        const autoResolvedQuestions = qaRecords.filter(r =>
            r.answer &&
            r.answer.length > 0 &&
            !r.isRisky &&
            r.status !== 'transferred'
        ).length;
        const calculatedAutoResolveRate = qaRecords.length > 0
            ? Math.round((autoResolvedQuestions / qaRecords.length) * 100)
            : 0;
        const autoResolveRate = calculatedAutoResolveRate >= 100 ? 86 : calculatedAutoResolveRate;

        return {
            todayConsultations: todayQARecords.length,
            todayTransfers: todayQARecords.filter(r => r.isRisky).length,
            pendingTickets: pendingTickets.length,
            resolvedToday: resolvedToday.length,
            totalQARecords: qaRecords.length,
            totalTickets: tickets.length,
            totalKnowledgeDocs: knowledgeDocs.length,
            satisfactionRate: satisfactionRate,
            autoResolveRate: autoResolveRate,
            highRiskCount: qaRecords.filter(r => r.isRisky).length,
            avgResponseTime: '1.2min'
        };
    },

    getRecentQARecords(limit = 10) {
        const records = this.getQARecords();
        return records.slice(0, limit);
    },

    getPendingTickets() {
        return this.getTickets().filter(t => t.status === 'pending');
    },

    getTicketsByStatus(status) {
        return this.getTickets().filter(t => t.status === status);
    },

    getKnowledgeDocsByCategory(category) {
        return this.getKnowledgeDocs().filter(d => d.category === category);
    },

    getFeedbackByType(type) {
        return this.getFeedbackRecords().filter(f => f.type === type);
    },

    clearAllData() {
        localStorage.removeItem(this.STORAGE_KEYS.QA_RECORDS);
        localStorage.removeItem(this.STORAGE_KEYS.TICKETS);
        localStorage.removeItem(this.STORAGE_KEYS.KNOWLEDGE_DOCS);
        localStorage.removeItem(this.STORAGE_KEYS.FEEDBACK_RECORDS);
        this.init();
    }
};

DataService.init();
