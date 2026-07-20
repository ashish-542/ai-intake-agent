require("dotenv").config();

const {
    generateText,
} = require("./llm/llmClient");

async function testGroq() {
    try {
        console.log(
            "Testing Groq connection..."
        );

        const response =
            await generateText(
                `Return only valid JSON:

{
  "status": "connected",
  "provider": "groq"
}`
            );

        console.log(
            "\nGroq response:"
        );

        console.log(response);
    } catch (error) {
        console.error(
            "Groq test failed:",
            error.message
        );

        process.exitCode = 1;
    }
}

testGroq();