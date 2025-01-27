export const convertGeminiToOpenAICompletionResponse = function (geminiResponse) {
    validateGeminiResponse(geminiResponse);
    
    // Extract the necessary information from Gemini's response
    const choices = geminiResponse.candidates.map((candidate, index) => {
        if (!candidate.content || !candidate.content.parts) {
            throw new Error(`Invalid candidate format at index ${index}`);
        }
        
        // Combine all text parts with newlines between them
        const combinedContent = candidate.content.parts
            .map(part => {
                if (!part || !part.text) {
                    throw new Error(`Invalid part format in candidate ${index}`);
                }
                return part.text;
            })
            .join('\n\n');

        return {
            index: index,
            message: {
                role: "assistant",
                content: combinedContent,
                refusal: null
            },
            logprobs: candidate.avgLogprobs,
            finish_reason: candidate.finishReason?.toLowerCase() || 'stop'
        };
    });

    // Create the OpenAI-style response object
    return {
        choices: choices
    };
}

export const convertOpenAIToGeminiPrompt = function (openAIPrompt) {
    if (!openAIPrompt || !openAIPrompt.messages || !Array.isArray(openAIPrompt.messages)) {
        throw new Error('Invalid OpenAI prompt format');
    }

    // Extract messages array
    const messages = openAIPrompt.messages;
    messages.forEach(validateMessage);

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

function validateMessage(message) {
    if (!message || typeof message !== 'object') {
        throw new Error('Invalid message format: message must be an object');
    }
    if (!message.role || typeof message.role !== 'string') {
        throw new Error('Invalid message format: role must be a string');
    }
    if (!message.content) {
        throw new Error('Invalid message format: content is required');
    }
}

function validateGeminiResponse(response) {
    if (!response || !response.candidates || !Array.isArray(response.candidates)) {
        throw new Error('Invalid Gemini response format');
    }
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
