const axios = require("axios");

const FHIR_BASE_URL =
    process.env.FHIR_BASE_URL || "https://r4.smarthealthit.org";

async function fetchPatients() {
    try {
        const response = await axios.get(`${FHIR_BASE_URL}/Patient`, {
            params: {
                _count: 15,
            },
            timeout: 15000,
            headers: {
                Accept: "application/fhir+json",
            },
        });

        return response.data.entry || [];
    } catch (error) {
        console.error(
            "FHIR Patient API Error:",
            error.response?.status || error.message
        );

        throw error;
    }
}

async function fetchPatientConditions(patientId) {
    try {
        const response = await axios.get(`${FHIR_BASE_URL}/Condition`, {
            params: {
                patient: patientId,
                _count: 20,
            },
            timeout: 15000,
            headers: {
                Accept: "application/fhir+json",
            },
        });

        return (response.data.entry || [])
            .map((entry) => entry.resource)
            .filter((resource) => resource?.resourceType === "Condition");
    } catch (error) {
        console.error(
            `Could not fetch conditions for patient ${patientId}:`,
            error.response?.status || error.message
        );

        // One patient's missing conditions should not stop the whole pipeline.
        return [];
    }
}

module.exports = {
    fetchPatients,
    fetchPatientConditions,
};