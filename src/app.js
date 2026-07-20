require("dotenv").config();

const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const readCSV = require("./ingest/csvReader");
const normalizeLead = require("./normalize/normalizeLead");

const {
    fetchPatients,
    fetchPatientConditions,
} = require("./ingest/fhirClient");

const normalizePatient = require("./normalize/normalizePatient");

const {
    validateRecord,
} = require("./utils/validation");

const {
    processRecord,
} = require("./agent/recordAgent");

const crmRoutes =
    require("./routes/crmRoutes");

const {
    sendRecordToCRM,
} = require("./delivery/crmClient");

const app = express();

app.use(express.json());

app.use(
    "/api/crm",
    crmRoutes
);

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message:
            "AI Intake Agent API is running",
    });
});

function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

function printSection(title) {
    console.log("");
    console.log("==============================");
    console.log(title);
    console.log("==============================");
}

async function saveFailedRecords(
    failedRecords
) {
    const filePath = path.join(
        __dirname,
        "../data/failed_records.json"
    );

    await fs.mkdir(
        path.dirname(filePath),
        {
            recursive: true,
        }
    );

    await fs.writeFile(
        filePath,
        JSON.stringify(
            failedRecords,
            null,
            2
        ),
        "utf8"
    );

    console.log(
        `✓ Failed records saved   : ${failedRecords.length}`
    );
}

async function start() {
    try {
        console.log("");
        console.log("==================================================");
        console.log("AI INTAKE AGENT");
        console.log("==================================================");

        printSection(
            "STEP 1 - DATA INGESTION"
        );

        const leads =
            await readCSV();

        console.log(
            `✓ CSV Leads Loaded       : ${leads.length}`
        );

        const patientEntries =
            await fetchPatients();

        console.log(
            `✓ FHIR Patients Loaded   : ${patientEntries.length}`
        );

        printSection(
            "STEP 2 - NORMALIZATION"
        );

        const normalizedLeads =
            leads.map(normalizeLead);

        console.log(
            `✓ Leads Normalized       : ${normalizedLeads.length}`
        );

        const normalizedPatients = [];

        let patientNormalizationFailures = 0;

        for (
            const entry of patientEntries
        ) {
            try {
                const patient =
                    entry.resource;

                if (!patient?.id) {
                    throw new Error(
                        "FHIR patient ID is missing"
                    );
                }

                const conditions =
                    await fetchPatientConditions(
                        patient.id
                    );

                const normalizedPatient =
                    normalizePatient(
                        entry,
                        conditions
                    );

                normalizedPatients.push(
                    normalizedPatient
                );
            } catch (error) {
                patientNormalizationFailures++;

                console.error(
                    `✗ Patient normalization failed: ${error.message}`
                );
            }
        }

        console.log(
            `✓ Patients Normalized    : ${normalizedPatients.length}`
        );

        if (
            patientNormalizationFailures > 0
        ) {
            console.log(
                `✗ Normalization Failed  : ${patientNormalizationFailures}`
            );
        }

        const allRecords = [
            ...normalizedLeads,
            ...normalizedPatients,
        ];

        console.log(
            `✓ Unified Records        : ${allRecords.length}`
        );

        const deliberateBadRecord = {
            id: null,
            source: "linkedin_csv",
            recordType: "lead",
            name: "",
            contactInfo: {
                email: "invalid-email",
                phone: null,
            },
            context: {
                jobTitle: null,
                company: null,
            },
            prioritySignals: [],
            rawPayload: {
                note:
                    "Deliberate invalid record for failure testing",
            },
            createdAt:
                new Date().toISOString(),
        };

        const recordsForValidation = [
            ...allRecords,
            deliberateBadRecord,
        ];

        printSection(
            "STEP 3 - VALIDATION"
        );

        const validRecords = [];
        const failedRecords = [];

        for (
            const record of
            recordsForValidation
        ) {
            const validationResult =
                validateRecord(record);

            if (
                validationResult.isValid
            ) {
                validRecords.push(record);
            } else {
                failedRecords.push({
                    recordId:
                        record.id ||
                        "unknown",
                    recordType:
                        record.recordType ||
                        "unknown",
                    name:
                        record.name ||
                        "unknown",
                    status:
                        "validation_failed",
                    errors:
                        validationResult.errors,
                    failedAt:
                        new Date().toISOString(),
                    rawRecord: record,
                });
            }
        }

        console.log(
            `✓ Records Checked        : ${recordsForValidation.length}`
        );

        console.log(
            `✓ Valid Records          : ${validRecords.length}`
        );

        console.log(
            `✗ Failed Records         : ${failedRecords.length}`
        );

        await saveFailedRecords(
            failedRecords
        );

        printSection(
            "STEP 4 - AI PROCESSING"
        );

        const processedRecords = [];

        let crmDelivered = 0;
        let processingFailures = 0;

        const leadRecord =
            validRecords.find(
                (record) =>
                    record.recordType ===
                    "lead"
            );

        const patientRecord =
            validRecords.find(
                (record) =>
                    record.recordType ===
                    "patient"
            );

        const recordsToProcess = [
            leadRecord,
            patientRecord,
        ].filter(Boolean);

        for (
            const record of
            recordsToProcess
        ) {
            try {
                console.log(
                    `🤖 Processing ${record.recordType}: ${record.name}`
                );

                const processedRecord =
                    await processRecord(
                        record
                    );

                const crmResult =
                    await sendRecordToCRM(
                        processedRecord
                    );

                const deliveredRecord = {
                    ...processedRecord,
                    crmDelivery: {
                        success: true,
                        action:
                            crmResult.action,
                        deliveredAt:
                            new Date().toISOString(),
                    },
                };

                processedRecords.push(
                    deliveredRecord
                );

                crmDelivered++;

                console.log(
                    `✓ CRM Record ${crmResult.action}`
                );

                await sleep(3000);
            } catch (error) {
                processingFailures++;

                console.error(
                    `✗ Failed ${record.recordType} ${record.id}: ${error.message}`
                );
            }
        }

        printSection(
            "FINAL SUMMARY"
        );

        console.log(
            `Records Processed       : ${processedRecords.length}`
        );

        console.log(
            `CRM Delivered           : ${crmDelivered}`
        );

        console.log(
            `Validation Failed       : ${failedRecords.length}`
        );

        console.log(
            `Processing Failed       : ${processingFailures}`
        );

        console.log("");
        console.log(
            processingFailures === 0
                ? "✓ Pipeline completed successfully."
                : "⚠ Pipeline completed with some failures."
        );

        return {
            validRecords,
            failedRecords,
            processedRecords,
        };
    } catch (error) {
        console.error("");
        console.error(
            `✗ Pipeline startup failed: ${error.message}`
        );

        return {
            validRecords: [],
            failedRecords: [],
            processedRecords: [],
        };
    }
}

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    async () => {
        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🌐 CRM API: http://localhost:${PORT}/api/crm/records`
        );

        console.log(
            `❤️ Health: http://localhost:${PORT}/health`
        );

        try {
            await start();
        } catch (error) {
            console.error(
                `✗ Pipeline execution failed: ${error.message}`
            );
        }
    }
);