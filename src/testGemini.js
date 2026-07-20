require("dotenv").config();

const {
    generateText,
} = require("./llm/llmClient");

async function testGemini() {
    try {
        console.log("Testing Gemini connection...");

        const response = await generateText(
            "Reply with exactly this sentence: Gemini connection successful."
        );

        console.log("Gemini response:");
        console.log(response);
    } catch (error) {
        console.error("Gemini test failed:", error.message);
        process.exitCode = 1;
    }
}

testGemini();