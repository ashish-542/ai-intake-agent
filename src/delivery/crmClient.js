const axios = require("axios");

const CRM_BASE_URL =
    process.env.CRM_BASE_URL ||
    "http://localhost:3000/api/crm";

function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

function isRetryableError(error) {
    const status =
        error?.response?.status ||
        error?.status ||
        null;

    return (
        !error.response ||
        status === 429 ||
        status >= 500
    );
}

async function sendRecordToCRM(
    record,
    options = {}
) {
    const maxRetries =
        options.maxRetries ?? 3;

    for (
        let attempt = 0;
        attempt <= maxRetries;
        attempt++
    ) {
        try {
            console.log(
                `[CRM CLIENT] Sending ${record.recordId} to CRM...`
            );

            const response = await axios.post(
                `${CRM_BASE_URL}/records`,
                record,
                {
                    timeout: 10000,
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                }
            );

            console.log(
                `[CRM CLIENT] Record ${record.recordId} ${response.data.action}`
            );

            return response.data;
        } catch (error) {
            const status =
                error?.response?.status ||
                "network_error";

            const message =
                error?.response?.data?.message ||
                error.message;

            console.error(
                `[CRM CLIENT] Attempt ${
                    attempt + 1
                } failed for ${
                    record.recordId
                } | Status: ${status} | ${message}`
            );

            const canRetry =
                isRetryableError(error) &&
                attempt < maxRetries;

            if (!canRetry) {
                throw new Error(
                    `CRM delivery failed for ${record.recordId}: ${message}`
                );
            }

            const retryDelay =
                2000 * (attempt + 1);

            console.log(
                `[CRM CLIENT] Retrying in ${
                    retryDelay / 1000
                } seconds...`
            );

            await sleep(retryDelay);
        }
    }

    throw new Error(
        `CRM delivery failed for ${record.recordId}`
    );
}

module.exports = {
    sendRecordToCRM,
};