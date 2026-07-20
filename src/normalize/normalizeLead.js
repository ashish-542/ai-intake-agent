const { randomUUID } = require("crypto");

function normalizeLead(lead) {
    return {
        id: lead.lead_id || randomUUID(),

        source: "linkedin_csv",

        recordType: "lead",

        name: lead.full_name || null,

        contactInfo: {
            email: null,
            phone: null,
        },

        context: {
            jobTitle: lead.job_title || null,
            company: lead.company || null,
            industry: lead.industry || null,
            companySize: lead.company_size || null,
            location: lead.location || null,
            linkedinHeadline: lead.linkedin_headline || null,
            recentActivity: lead.recent_activity || null,
            connectionNote: lead.connection_note || null,
        },

        prioritySignals: [],

        rawPayload: lead,

        createdAt: new Date().toISOString(),
    };
}

module.exports = normalizeLead;