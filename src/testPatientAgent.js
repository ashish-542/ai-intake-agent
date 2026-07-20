require("dotenv").config();

const {
    processRecord,
} = require("./agent/recordAgent");

const testPatient = {
    id: "patient-test-001",
    source: "fhir",
    recordType: "patient",

    name: "Ned Hintz",

    contactInfo: {
        email: null,
        phone: "555-841-1500",
    },

    context: {
        gender: "male",
        birthDate: "1993-12-08",
        language: "English",

        address: {
            city: "Boston",
            state: "Massachusetts",
            country: "US",
        },

        conditions: [
            {
                id: "condition-test-001",
                display: "Essential hypertension",
                code: "59621000",
                clinicalStatus: "active",
                verificationStatus: "confirmed",
                recordedDate: "2025-06-12",
                onsetDateTime: null,
            },
        ],
    },

    prioritySignals: [],

    rawPayload: {},

    createdAt: new Date().toISOString(),
};

async function testPatientAgent() {
    try {
        console.log(
            "Testing patient AI agent...\n"
        );

        const result = await processRecord(
            testPatient
        );

        console.log(
            "\n========== PATIENT AGENT RESULT =========="
        );

        console.log(
            JSON.stringify(result, null, 2)
        );

        console.log(
            "=========================================="
        );
    } catch (error) {
        console.error(
            "Patient agent test failed:",
            error.message
        );

        process.exitCode = 1;
    }
}

testPatientAgent();