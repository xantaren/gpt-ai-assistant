export const convertGeminiToOpenAICompletionResponse = function (geminiResponse) {
    // Extract the necessary information from Gemini's response
    const choices = geminiResponse.candidates.map((candidate, index) => {
        return {
            index: index,
            message: {
                role: "assistant", // Keep as assistant instead of using candidate.content.role
                content: candidate.content.parts[0].text,
                refusal: null
            },
            logprobs: candidate.avgLogprobs,
            finish_reason: candidate.finishReason.toLowerCase() // Convert STOP to stop
        };
    });

    // Create the OpenAI-style response object
    return {
        choices: choices
    };
}

export const convertOpenAIToGeminiPrompt = function (openAIPrompt) {
    // Extract messages array
    const messages = openAIPrompt.messages;

    // Initialize result object
    const result = {
        history: [],
        systemInstruction: '',
        message: []
    };

    // Find system message (should be first, but let's be safe)
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
        result.systemInstruction = systemMessage.content;
    }

    // Get the last user message for the 'message' field
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (lastUserMessage) {
        result.message = convertContent(lastUserMessage.content);
    }

    // Build history array excluding system message and last user message
    for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];

        // Skip system messages and the last user message
        if (msg.role === 'system' ||
            (msg === lastUserMessage)) {
            continue;
        }

        // Convert assistant role to model
        const role = msg.role === 'assistant' ? 'model' : msg.role;

        result.history.push({
            role: role,
            parts: convertContent(msg.content)
        });
    }

    return result;
}

function convertContent(content) {
    // If content is a string, wrap it in a text object
    if (typeof content === 'string') {
        return [{ text: content }];
    }

    // If content is an array, process each item
    if (Array.isArray(content)) {
        return content.map(item => {
            if (item.type === 'text') {
                return { text: item.text };
            }
            if (item.type === 'image_url') {
                // Extract base64 data and mime type from the data URL
                const url = item.image_url.url;
                const matches = url.match(/^data:([^;]+);base64,(.+)$/);

                if (matches) {
                    const [, mimeType, data] = matches;
                    return {
                        inlineData: {
                            data: data,
                            mimeType: mimeType
                        }
                    };
                }
            }
            return null;
        }).filter(Boolean); // Remove any null values
    }

    // Default case: empty array
    return [];
}