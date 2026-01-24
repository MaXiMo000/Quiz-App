import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

/**
 * ⚠️ UTILITY SCRIPT ONLY - NOT USED IN API CALLS ⚠️
 *
 * This is a standalone utility to check which models are available.
 * It is NOT called during normal API operations (quiz generation, etc.)
 *
 * Usage: npm run check-models (runs as separate script)
 *
 * The actual API uses generateFromGemini() which directly calls models
 * without any checking/testing phase for maximum performance.
 *
 * Check which Gemini models are available for your API key
 * This helps identify which models you have access to based on your quota tier
 */
export const checkAvailableModels = async () => {
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY is not set in .env file");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // List of models to test - matches MODEL_PRIORITY in geminiHelper.js
    // Test main model first, then fallbacks (optimized order)
    const modelsToTest = [
        // Main model (test first)
        "gemini-2.5-pro",

        // Fallback Tier 1: Highest quota models
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",

        // Fallback Tier 2: Good quota models
        "gemini-2.5-flash",
        "gemini-3-flash",

        // Fallback Tier 3: Other premium models
        "gemini-3-pro",

        // Fallback Tier 4: Legacy models (test only if needed)
        "gemini-1.5-pro",
        "gemini-1.5-flash"
    ];

    console.log("🔍 Checking available Gemini models for your API key...\n");
    console.log("=" .repeat(60));

    const results = {
        available: [],
        unavailable: [],
        errors: []
    };

    // Performance: Add timeout for each model test (5 seconds max per model)
    const TEST_TIMEOUT = 5000; // 5 seconds

    for (const modelName of modelsToTest) {
        const testStartTime = Date.now();
        try {
            const model = genAI.getGenerativeModel({ model: modelName });

            // Performance: Use Promise.race to add timeout
            const testPromise = model.generateContent({
                contents: [{ parts: [{ text: "Say 'OK' if you can hear me." }] }]
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Test timeout")), TEST_TIMEOUT)
            );

            // Try a simple test request with timeout
            const result = await Promise.race([testPromise, timeoutPromise]);
            const response = result.response.text();

            const testDuration = Date.now() - testStartTime;

            // SECURITY: Don't store full response, just confirm it worked
            results.available.push({
                model: modelName,
                status: "✅ Available",
                responseLength: response.length, // Only store length, not content
                testDuration: `${testDuration}ms`
            });

            console.log(`✅ ${modelName.padEnd(30)} - Available (${testDuration}ms, ${response.length} chars)`);

        } catch (error) {
            const testDuration = Date.now() - testStartTime;
            const errorMsg = error.message || error.toString();

            // Check for specific error types
            if (errorMsg.includes("timeout") || errorMsg.includes("Test timeout")) {
                results.unavailable.push({
                    model: modelName,
                    reason: `Timeout after ${TEST_TIMEOUT}ms`
                });
                console.log(`⏱️  ${modelName.padEnd(30)} - Timeout (${testDuration}ms)`);
            } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
                results.unavailable.push({
                    model: modelName,
                    reason: "Model not found or not available"
                });
                console.log(`❌ ${modelName.padEnd(30)} - Not available (404)`);
            } else if (errorMsg.includes("429") || errorMsg.includes("quota")) {
                // If quota error, model exists but quota exceeded
                results.available.push({
                    model: modelName,
                    status: "⚠️  Available (quota exceeded)",
                    note: "Model exists but quota limit reached"
                });
                console.log(`⚠️  ${modelName.padEnd(30)} - Available (quota exceeded)`);
            } else {
                results.errors.push({
                    model: modelName,
                    error: errorMsg.substring(0, 100) // Limit error message length
                });
                console.log(`❓ ${modelName.padEnd(30)} - Error: ${errorMsg.substring(0, 40)}...`);
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Summary:");
    console.log(`✅ Available models: ${results.available.length}`);
    console.log(`❌ Unavailable models: ${results.unavailable.length}`);
    console.log(`❓ Errors: ${results.errors.length}`);

    if (results.available.length > 0) {
        console.log("\n✨ Models you can use:");
        results.available.forEach(item => {
            console.log(`   - ${item.model} ${item.status || ""}`);
        });
    }

    if (results.unavailable.length > 0) {
        console.log("\n🚫 Models not available:");
        results.unavailable.forEach(item => {
            console.log(`   - ${item.model}: ${item.reason}`);
        });
    }

    console.log("\n💡 Tips:");
    console.log("   - Check your quota limits at: https://aistudio.google.com/app/apikey");
    console.log("   - View billing/quota in Google Cloud Console: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas");
    console.log("   - Premium models require billing to be set up");

    return results;
};

// Run if called directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('checkGeminiModels.js');

if (isMainModule) {
    checkAvailableModels()
        .then(() => process.exit(0))
        .catch(error => {
            console.error("Error checking models:", error);
            process.exit(1);
        });
}
