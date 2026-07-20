const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const router = express.Router();

const CRM_FILE_PATH = path.join(
    __dirname,
    "../../data/processed_records.json"
);

async function ensureCRMFileExists() {
    const dataDirectory = path.dirname(
        CRM_FILE_PATH
    );

    await fs.mkdir(dataDirectory, {
        recursive: true,
    });

    try {
        await fs.access(CRM_FILE_PATH);
    } catch (error) {
        await fs.writeFile(
            CRM_FILE_PATH,
            JSON.stringify([], null, 2),
            "utf8"
        );
    }
}

async function readCRMRecords() {
    await ensureCRMFileExists();

    const fileContent = await fs.readFile(
        CRM_FILE_PATH,
        "utf8"
    );

    if (!fileContent.trim()) {
        return [];
    }

    const records = JSON.parse(fileContent);

    if (!Array.isArray(records)) {
        throw new Error(
            "CRM data file must contain a JSON array"
        );
    }

    return records;
}

async function writeCRMRecords(records) {
    await fs.writeFile(
        CRM_FILE_PATH,
        JSON.stringify(records, null, 2),
        "utf8"
    );
}

/*
    POST /api/crm/records

    Receives one AI-processed record and stores it
    in the local JSON CRM database.
*/
router.post("/records", async (req, res) => {
    try {
        const record = req.body;

        if (!record || !record.recordId) {
            return res.status(400).json({
                success: false,
                message: "recordId is required",
            });
        }

        const records = await readCRMRecords();

        const existingRecordIndex =
            records.findIndex(
                (item) =>
                    item.recordId ===
                    record.recordId
            );

        let action;

        if (existingRecordIndex >= 0) {
            records[existingRecordIndex] = {
                ...record,
                crmUpdatedAt:
                    new Date().toISOString(),
            };

            action = "updated";
        } else {
            records.push({
                ...record,
                crmCreatedAt:
                    new Date().toISOString(),
            });

            action = "created";
        }

        await writeCRMRecords(records);

        return res.status(
            action === "created" ? 201 : 200
        ).json({
            success: true,
            message: `CRM record ${action}`,
            action,
            recordId: record.recordId,
        });
    } catch (error) {
        console.error(
            "[CRM API] Failed to save record:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to save record in CRM",
            error: error.message,
        });
    }
});

/*
    GET /api/crm/records

    Returns all records stored in the local CRM.
*/
router.get("/records", async (req, res) => {
    try {
        const records = await readCRMRecords();

        return res.status(200).json({
            success: true,
            total: records.length,
            records,
        });
    } catch (error) {
        console.error(
            "[CRM API] Failed to read records:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to read CRM records",
            error: error.message,
        });
    }
});

/*
    GET /api/crm/records/:recordId

    Returns one CRM record by ID.
*/
router.get(
    "/records/:recordId",
    async (req, res) => {
        try {
            const records =
                await readCRMRecords();

            const record = records.find(
                (item) =>
                    item.recordId ===
                    req.params.recordId
            );

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message:
                        "CRM record not found",
                });
            }

            return res.status(200).json({
                success: true,
                record,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    "Failed to read CRM record",
                error: error.message,
            });
        }
    }
);

module.exports = router;