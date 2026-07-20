require("dotenv").config();

const Groq = require("groq-sdk");

if (!process.env.GROQ_API_KEY) {
    throw new Error(
        "GROQ_API_KEY is missing from the .env file"
    );
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

function getErrorStatus(error) {
    return (
        error?.status ||
        error?.statusCode ||
        error?.response?.status ||
        error?.error?.code ||
        null
    );
}

function isRateLimitError(error) {
    const status = getErrorStatus(error);

    const message = String(
        error?.message || error
    ).toLowerCase();

    return (
        status === 429 ||
        message.includes("rate limit") ||
        message.includes("too many requests")
    );
}

function getRetryDelay(error) {
    const retryAfter =
        error?.headers?.["retry-after"] ||
        error?.response?.headers?.["retry-after"];

    if (retryAfter) {
        const seconds = Number(retryAfter);

        if (!Number.isNaN(seconds)) {
            return Math.ceil(seconds * 1000);
        }
    }

    const message = String(
        error?.message || error
    );

    const secondMatch = message.match(
        /try again in\s+([\d.]+)s/i
    );

    if (secondMatch) {
        return Math.ceil(
            Number(secondMatch[1]) * 1000
        );
    }

    const millisecondMatch = message.match(
        /try again in\s+([\d.]+)ms/i
    );

    if (millisecondMatch) {
        return Math.ceil(
            Number(millisecondMatch[1])
        );
    }

    return null;
}

async function generateText(
    prompt,
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
            const completion =
                await groq.chat.completions.create({
                    model:
                        process.env.GROQ_MODEL ||
                        "llama-3.3-70b-versatile",

                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],

                    temperature:
                        options.temperature ?? 0.2,

                    max_tokens:
                        options.maxTokens ?? 1000,
                });

            const text =
                completion?.choices?.[0]
                    ?.message?.content;

            if (!text) {
                throw new Error(
                    "Groq returned an empty response"
                );
            }

            return text.trim();
        } catch (error) {
            console.error(
                "Groq API request failed:",
                error.message
            );

            const canRetry =
                isRateLimitError(error) &&
                attempt < maxRetries;

            if (!canRetry) {
                throw error;
            }

            const retryDelay =
                getRetryDelay(error) ||
                5000 * (attempt + 1);

            console.log(
                `[LLM] Groq rate limit reached. ` +
                `Waiting ${Math.ceil(
                    retryDelay / 1000
                )} seconds before retry ` +
                `${attempt + 1}/${maxRetries}...`
            );

            await sleep(
                retryDelay + 1000
            );
        }
    }

    throw new Error(
        "Groq request failed after retries"
    );
}

module.exports = {
    generateText,
};