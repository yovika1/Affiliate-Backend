import { model } from "./aiService.js";

export const extractKeywords = async (message) => {

const prompt = `
Extract only fashion or beauty product keywords.

Return only comma separated words.

Examples:

Message: casual shirt for college
Keywords: shirt, casual

Message: lipstick for dark skin
Keywords: lipstick

Message:
${message}
`;

const result = await model.generateContent(prompt);

const text = result.response.text().trim().toLowerCase();

return text.split(",");
};