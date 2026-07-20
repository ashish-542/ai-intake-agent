function getPatientName(patient) {
    const officialName =
        patient.name?.find((name) => name.use === "official") ||
        patient.name?.[0];

    if (!officialName) {
        return null;
    }

    const givenNames = officialName.given?.join(" ") || "";
    const familyName = officialName.family || "";

    return `${givenNames} ${familyName}`.trim() || null;
}

function getTelecom(patient, system) {
    return (
        patient.telecom?.find((item) => item.system === system)?.value || null
    );
}

function getAddress(patient) {
    const address = patient.address?.[0];

    if (!address) {
        return null;
    }

    return {
        line: address.line?.join(", ") || null,
        city: address.city || null,
        state: address.state || null,
        postalCode: address.postalCode || null,
        country: address.country || null,
    };
}

function getPreferredLanguage(patient) {
    return (
        patient.communication?.[0]?.language?.text ||
        patient.communication?.[0]?.language?.coding?.[0]?.display ||
        patient.communication?.[0]?.language?.coding?.[0]?.code ||
        null
    );
}

function normalizeConditions(conditions) {
    return conditions.map((condition) => {
        const coding = condition.code?.coding?.[0];

        return {
            id: condition.id || null,

            display:
                condition.code?.text ||
                coding?.display ||
                "Unspecified condition",

            code: coding?.code || null,

            clinicalStatus:
                condition.clinicalStatus?.coding?.[0]?.code || null,

            verificationStatus:
                condition.verificationStatus?.coding?.[0]?.code || null,

            recordedDate: condition.recordedDate || null,

            onsetDateTime: condition.onsetDateTime || null,
        };
    });
}

function normalizePatient(entry, conditions = []) {
    const patient = entry.resource;

    if (!patient || patient.resourceType !== "Patient") {
        throw new Error("Invalid FHIR Patient entry");
    }

    const normalizedConditions = normalizeConditions(conditions);

    return {
        id: patient.id,

        source: "fhir",

        recordType: "patient",

        name: getPatientName(patient),

        contactInfo: {
            email: getTelecom(patient, "email"),
            phone: getTelecom(patient, "phone"),
        },

        context: {
            gender: patient.gender || null,
            birthDate: patient.birthDate || null,
            language: getPreferredLanguage(patient),
            address: getAddress(patient),
            conditions: normalizedConditions,
        },

        prioritySignals: [],

        /*
         * Keep only the fields needed for debugging.
         * Avoid storing complete identifiers such as synthetic SSN,
         * passport and driver's licence values.
         */
        rawPayload: {
            resourceType: patient.resourceType,
            id: patient.id,
            name: patient.name || [],
            telecom: patient.telecom || [],
            gender: patient.gender || null,
            birthDate: patient.birthDate || null,
            address: patient.address || [],
            communication: patient.communication || [],
        },

        createdAt: new Date().toISOString(),
    };
}

module.exports = normalizePatient;