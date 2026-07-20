function isValidEmail(email) {
    if (!email) {
        return true;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}

function validateCommonFields(record) {
    const errors = [];

    if (!record || typeof record !== "object") {
        errors.push("Record must be an object");
        return errors;
    }

    if (!record.id) {
        errors.push("Record ID is missing");
    }

    if (!record.source) {
        errors.push("Record source is missing");
    }

    if (!record.recordType) {
        errors.push("Record type is missing");
    }

    if (!record.name || !record.name.trim()) {
        errors.push("Record name is missing");
    }

    if (!["lead", "patient"].includes(record.recordType)) {
        errors.push(
            `Unsupported record type: ${record.recordType}`
        );
    }

    if (
        record.contactInfo?.email &&
        !isValidEmail(record.contactInfo.email)
    ) {
        errors.push("Invalid email address");
    }

    return errors;
}

function validateLead(record) {
    const errors = [];

    if (!record.context?.company) {
        errors.push("Lead company is missing");
    }

    if (!record.context?.jobTitle) {
        errors.push("Lead job title is missing");
    }

    return errors;
}

function validatePatient(record) {
    const errors = [];

    if (record.source !== "fhir") {
        errors.push("Patient source must be fhir");
    }

    if (!record.context?.birthDate) {
        errors.push("Patient birth date is missing");
    }

    return errors;
}

function validateRecord(record) {
    const errors = validateCommonFields(record);

    if (record?.recordType === "lead") {
        errors.push(...validateLead(record));
    }

    if (record?.recordType === "patient") {
        errors.push(...validatePatient(record));
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

module.exports = {
    validateRecord,
};