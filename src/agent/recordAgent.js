const {
    generateText,
} = require("../llm/llmClient");

/**
 * Extracts JSON from the LLM response.
 */
function extractJson(responseText) {
    if (!responseText) {
        throw new Error(
            "Empty response received from LLM"
        );
    }

    const cleanedText = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const firstBrace =
        cleanedText.indexOf("{");

    const lastBrace =
        cleanedText.lastIndexOf("}");

    if (
        firstBrace === -1 ||
        lastBrace === -1
    ) {
        throw new Error(
            "No valid JSON object found in LLM response"
        );
    }

    const jsonText = cleanedText.slice(
        firstBrace,
        lastBrace + 1
    );

    return JSON.parse(jsonText);
}

/**
 * Sends only useful lead fields to the LLM.
 */
function buildLeadInput(record) {
    return {
        name: record.name,
        jobTitle:
            record.context?.jobTitle || null,
        company:
            record.context?.company || null,
        industry:
            record.context?.industry || null,
        companySize:
            record.context?.companySize || null,
        location:
            record.context?.location || null,
        linkedinHeadline:
            record.context
                ?.linkedinHeadline || null,
        recentActivity:
            record.context
                ?.recentActivity || null,
        connectionNote:
            record.context
                ?.connectionNote || null,
        emailAvailable: Boolean(
            record.contactInfo?.email
        ),
        phoneAvailable: Boolean(
            record.contactInfo?.phone
        ),
        linkedinAvailable: true,
    };
}

/**
 * Sends only useful patient fields to the LLM.
 */
function buildPatientInput(record) {
    const conditions =
        record.context?.conditions || [];

    return {
        name: record.name,
        gender:
            record.context?.gender || null,
        birthDate:
            record.context?.birthDate || null,
        language:
            record.context?.language || null,
        phoneAvailable: Boolean(
            record.contactInfo?.phone
        ),
        emailAvailable: Boolean(
            record.contactInfo?.email
        ),
        conditions: conditions.map(
            (condition) => ({
                name:
                    condition.display ||
                    "Unknown condition",
                clinicalStatus:
                    condition.clinicalStatus ||
                    "unknown",
                verificationStatus:
                    condition.verificationStatus ||
                    "unknown",
            })
        ),
    };
}

/**
 * One prompt performs:
 * 1. Classification
 * 2. Priority decision
 * 3. Recommended action
 * 4. Channel selection
 * 5. Reasoning
 * 6. Message generation
 */
function buildLeadPrompt(record) {
    const leadInput =
        buildLeadInput(record);

    return `
You are an AI intake and outreach agent.

Analyze the following lead and return ONLY valid JSON.

Required JSON format:

{
  "classification": "hot | warm | cold | manual_review_required",
  "priority": "high | medium | low",
  "recommendedAction": "send_email | schedule_call | send_linkedin_message | manual_review | no_action",
  "channel": "email | phone | linkedin | internal | none",
  "tone": "consultative | professional | friendly | supportive",
  "prioritySignals": [],
  "reasoning": "",
  "generatedMessage": ""
}

Rules:

1. Determine whether the person is likely to influence or make purchasing decisions.
2. Identify buying intent from recent activity, headline and connection note.
3. Use email only when emailAvailable is true.
4. Use phone only when phoneAvailable is true.
5. Use LinkedIn only when linkedinAvailable is true.
6. If no suitable outreach channel exists, use:
   - recommendedAction: "manual_review"
   - channel: "internal"
7. The message must be short, professional and personalized.
8. Do not invent facts.
9. Return JSON only. Do not use markdown.

Lead:

${JSON.stringify(leadInput, null, 2)}
`;
}

function buildPatientPrompt(record) {
    const patientInput =
        buildPatientInput(record);

    return `
You are an AI patient intake support agent.

The patient data is synthetic FHIR test data.

Analyze the patient record and return ONLY valid JSON.

Required JSON format:

{
  "classification": "routine_outreach | follow_up_recommended | manual_review_required",
  "priority": "high | medium | low",
  "recommendedAction": "schedule_call | send_message | manual_review | no_action",
  "channel": "phone | email | internal | none",
  "tone": "supportive | professional | reassuring",
  "prioritySignals": [],
  "reasoning": "",
  "generatedMessage": ""
}

Safety rules:

1. Do not diagnose the patient.
2. Do not recommend medication.
3. Do not provide treatment advice.
4. Consider only the supplied patient information.
5. Use phone only when phoneAvailable is true.
6. Use email only when emailAvailable is true.
7. If the record is uncertain or requires human attention, use:
   - classification: "manual_review_required"
   - recommendedAction: "manual_review"
   - channel: "internal"
8. When channel is "internal", generatedMessage must be an internal review note and not a patient-facing message.
9. For patient outreach, create a short and supportive message.
10. Return JSON only. Do not use markdown.

Patient:

${JSON.stringify(patientInput, null, 2)}
`;
}

function applyDecisionRules(
    record,
    result
) {
    const normalizedResult = {
        ...result,
    };

    if (
        record.recordType === "patient" &&
        (
            normalizedResult.classification ===
                "manual_review_required" ||
            normalizedResult.recommendedAction ===
                "manual_review"
        )
    ) {
        normalizedResult.classification =
            "manual_review_required";

        normalizedResult.recommendedAction =
            "manual_review";

        normalizedResult.channel =
            "internal";

        if (
            !normalizedResult
                .generatedMessage
                ?.toLowerCase()
                .includes("internal")
        ) {
            normalizedResult.generatedMessage =
                `Internal review required: ${
                    normalizedResult.reasoning ||
                    "The patient record requires manual review before outreach."
                }`;
        }
    }

    if (
        record.recordType === "lead" &&
        normalizedResult.recommendedAction ===
            "manual_review"
    ) {
        normalizedResult.channel =
            "internal";
    }

    return normalizedResult;
}

async function processRecord(record) {
    console.log(
        `[AGENT] Analyzing ${record.recordType} ${record.id}`
    );

    const prompt =
        record.recordType === "lead"
            ? buildLeadPrompt(record)
            : buildPatientPrompt(record);

    const responseText =
        await generateText(prompt);

    const rawResult =
        extractJson(responseText);

    const result =
        applyDecisionRules(
            record,
            rawResult
        );

    return {
        recordId: record.id,
        source: record.source,
        recordType: record.recordType,
        name: record.name,
        contactInfo:
            record.contactInfo,
        context: record.context,

        agentDecision: {
            classification:
                result.classification,
            priority:
                result.priority,
            recommendedAction:
                result.recommendedAction,
            channel:
                result.channel,
            tone:
                result.tone,
            prioritySignals:
                result.prioritySignals ||
                [],
            reasoning:
                result.reasoning,
        },

        generatedMessage:
            result.generatedMessage,

        processingStatus: "processed",
        processedAt:
            new Date().toISOString(),
    };
}

module.exports = {
    processRecord,
};