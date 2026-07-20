require("dotenv").config();

const {
    processRecord,
} = require("./agent/recordAgent");

const testLead = {
    id: "L005",
    source: "linkedin_csv",
    recordType: "lead",
    name: "Angela Torres",

    contactInfo: {
        email: "angela.torres@example.com",
        phone: null,
    },

    context: {
        jobTitle: "VP Marketing",
        company: "ClearPath Urgent Care",
        industry: "Healthcare",
        companySize: "201-500",
        location: "Phoenix AZ",
        linkedinHeadline:
            "VP Marketing scaling multi-location urgent care brand",
        recentActivity:
            "Attended a HubSpot webinar last week",
        connectionNote:
            "Requested a demo via website form",
    },

    prioritySignals: [],

    rawPayload: {},

    createdAt: new Date().toISOString(),
};

async function testAgent() {
    try {
        console.log("Testing AI agent...\n");

        const result = await processRecord(testLead);

        console.log("\n========== AGENT RESULT ==========");
        console.log(JSON.stringify(result, null, 2));
        console.log("==================================");
    } catch (error) {
        console.error(
            "Agent test failed:",
            error.message
        );

        process.exitCode = 1;
    }
}

testAgent();