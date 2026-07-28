const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = "AQ.Ab8RN6Ij-ITyOZy09qfVaeBuoCqfbBsSTyhAABlYMMU0OQsA8w";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Salom!");
        console.log("SUCCESS:", result.response.text());
    } catch (e) {
        console.error("ERROR_MESSAGE:", e.message);
        console.error("FULL_ERROR:", e);
    }
}
run();
