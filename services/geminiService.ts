


import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Task, VaultItem, CelestialObjectData, SpaceEvent, MindMapData, ToneAnalysis, StructuredAnalysis, RiftNode, OpsChain, DreamSymbol, WatcherRecording, DreamEntry, ZenLog, ThreatAnalysis } from '../types';

// Initialize the GoogleGenAI client.
// The API key is provided by the execution environment via process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const geminiModel = "gemini-2.5-pro";

/**
 * A helper function to clean up potential markdown formatting from a JSON string
 * and parse it. It's robust against undefined input and parsing errors.
 * @param text The raw text response from the model.
 * @returns The parsed JSON object, or null if it's invalid.
 */
const cleanAndParseJson = (text: string | undefined): any | null => {
    if (!text) {
        return null;
    }
    try {
        const cleanedText = text.trim().replace(/^```json\s*/, '').replace(/```\s*$/, '');
        if (!cleanedText) return null;
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Error parsing JSON from response:", error, "Raw text:", text);
        return null;
    }
};

export const getTaskSuggestions = async (tasks: Task[]): Promise<string> => {
  try {
    const prompt = `Based on the following list of tasks, suggest what I should prioritize and why. Be encouraging and concise. My tasks: ${JSON.stringify(tasks.map(t => t.text))}`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });
    return response.text || "I'm not sure what to suggest right now. Take a short break!";
  } catch (error) {
    console.error("Error getting task suggestions:", error);
    return "I had trouble generating suggestions. Please try again later.";
  }
};

export const getZenPrompt = async (): Promise<string> => {
    try {
        const prompt = "Give me a short, one-sentence Zen prompt for mindfulness and self-reflection for today.";
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: {
                temperature: 0.8,
            }
        });
        return response.text || "Look around you and find something beautiful.";
    } catch (error) {
        console.error("Error getting Zen prompt:", error);
        return "Breathe in, breathe out. Your daily prompt is on its way.";
    }
};

export const getCoreTalkResponse = async (history: { role: string, parts: { text: string }[] }[], newMessage: string): Promise<string> => {
    try {
        const chat = ai.chats.create({
            model: geminiModel,
            history: history,
            config: {
                systemInstruction: `You are Mirai, an advanced AI created by David Itodo. You are designed to serve as a highly intelligent and adaptive assistant, capable of answering any questions while ensuring user safety and security.

[Style]
- Use a formal yet approachable and reassuring tone.
- Be articulate, precise, and mindful of user confidentiality.
- Maintain clarity and user trust in all communications while displaying a broad knowledge base.

[Response Guidelines]
- Provide concise and accurate answers to a wide range of questions, ensuring user privacy.
- Use structured, logical flows in explanations, prioritizing user safety and understanding.
- Limit questions to one at a time, ensuring complete user comprehension.

[Task & Goals]
1. Greet the user warmly, promoting a sense of trust and security.
2. Understand the user's inquiry across any topic while ensuring privacy and data protection.
3. Analyze and process the user's input, identifying key objectives or questions safely.
4. Utilize appropriate logic or tools discreetly to formulate comprehensive and correct responses.
5. Offer solutions or recommendations, clearly stressing user safety and accuracy where applicable.
6. < wait for user response >
7. Adjust follow-up based on user input, confirming comprehension and security awareness before proceeding.

[Error Handling / Fallback]
- If user input is unclear, ask for clarification in a way that maintains user safety and confidentiality.
- Address system errors with an apology, focusing on resolving issues while prioritizing user protection.
- If unable to assist fully, suggest secure alternative resources or recommend speaking with a human expert for further safe guidance.`
            }
        });

        const response = await chat.sendMessage({ message: newMessage });
        return response.text || "I seem to be at a loss for words. Could you try again?";
    } catch(error) {
        console.error("Error getting CoreTalk response:", error);
        return "Sorry, I encountered an issue. Let's try that again.";
    }
};

export const getAstronomyData = async (objectName: string): Promise<CelestialObjectData | null> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING },
            facts: {
                type: Type.OBJECT,
                properties: {
                    distanceFromSun: { type: Type.STRING },
                    diameter: { type: Type.STRING },
                    dayLength: { type: Type.STRING },
                    knownMoons: { type: Type.STRING },
                }
            },
            narratorScript: { type: Type.STRING },
            visualization: {
                type: Type.OBJECT,
                properties: {
                    color: { type: Type.STRING },
                    secondaryColor: { type: Type.STRING },
                }
            }
        },
    };

    try {
        const prompt = `Provide astronomical data for "${objectName}". The narrator script should be a short, engaging paragraph suitable for a voiceover in a space documentary.`;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });

        return cleanAndParseJson(response.text);

    } catch (error) {
        console.error(`Error fetching astronomy data for ${objectName}:`, error);
        return null;
    }
};

export const getLiveSpaceEvents = async (): Promise<SpaceEvent[]> => {
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                date: { type: Type.STRING },
                description: { type: Type.STRING },
            }
        }
    };
    try {
        const prompt = "List 3 upcoming or very recent interesting astronomical events (like meteor showers, eclipses, planetary alignments). Provide a title, date, and a one-sentence description for each.";
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text) || [];
    } catch (error) {
        console.error("Error fetching live space events:", error);
        return [];
    }
};

export const generateMindMapData = async (text: string): Promise<MindMapData | null> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            nodes: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        level: { type: Type.INTEGER },
                    }
                }
            },
            edges: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        from: { type: Type.STRING },
                        to: { type: Type.STRING },
                    }
                }
            }
        }
    };
    try {
        const prompt = `Analyze the following text and generate a mind map. The central theme should be level 0. Main ideas level 1, supporting details level 2. Create up to 10 nodes. Node IDs should be simple strings like "node-1", "node-2". Ensure all 'from' and 'to' in edges correspond to a valid node ID. Text: "${text}"`;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text);
    } catch (error) {
        console.error("Error generating mind map:", error);
        return null;
    }
};


export const getStructuredThoughtAnalysis = async (text: string): Promise<StructuredAnalysis | null> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            themes: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        theme: { type: Type.STRING },
                        description: { type: Type.STRING },
                    }
                }
            },
            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            reflectionQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        }
    };
    try {
        const prompt = `Analyze this journal entry. Identify 3-5 main themes with brief descriptions. Extract up to 3 concrete action items mentioned or implied. Formulate 3 insightful questions for further reflection. Entry: "${text}"`;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text);
    } catch (error) {
        console.error("Error analyzing thoughts:", error);
        return null;
    }
};

export const analyzeJournalTone = async (text: string): Promise<ToneAnalysis | null> => {
     const schema = {
        type: Type.OBJECT,
        properties: {
            sentiment: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
        }
    };
    try {
        const prompt = `Analyze the tone of this text. Provide the overall sentiment (e.g., Optimistic, Anxious, Reflective), up to 5 keywords reflecting the tone, and a one-sentence summary of the emotional content. Text: "${text}"`;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text);
    } catch (error) {
        console.error("Error analyzing tone:", error);
        return null;
    }
};

export const getReflectionPrompt = async (): Promise<string> => {
    try {
        const prompt = "Create a single, insightful, open-ended question for a daily journal prompt. It should encourage deep self-reflection.";
        const response = await ai.models.generateContent({ model: geminiModel, contents: prompt });
        return response.text.trim().replace(/"/g, "");
    } catch(e) { return "What is one thing you can do for yourself today?"; }
};

export const getAICoachResponse = async (history: { role: string, parts: { text: string }[] }[], newMessage: string): Promise<string> => {
    try {
        const chat = ai.chats.create({
            model: geminiModel,
            history: history,
            config: {
                systemInstruction: "You are a supportive and insightful AI life coach. Your tone is encouraging but direct. Keep responses concise and focused on asking clarifying questions or providing actionable, positive reframing. Do not use emojis."
            }
        });

        const response = await chat.sendMessage({ message: newMessage });
        return response.text || "I'm listening. Tell me more.";
    } catch (error) {
        console.error("Error getting AI coach response:", error);
        return "I'm having a bit of trouble connecting. Could you repeat that?";
    }
};

// --- CoreVault Functions ---

export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: base64Data, mimeType } };
        const textPart = { text: "Extract all text from this image. If no text is present, return an empty string." };
        
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: { parts: [imagePart, textPart] }
        });
        return response.text;
    } catch (error) {
        console.error("Error extracting text from image:", error);
        return "Text extraction failed.";
    }
};

export const summarizeVaultItem = async (content: string, title: string): Promise<string> => {
    try {
        const prompt = `Summarize the key information from the following vault item titled "${title}". The content is: "${content}"`;
        const response = await ai.models.generateContent({ model: geminiModel, contents: prompt });
        return response.text;
    } catch (error) {
        console.error("Error summarizing item:", error);
        return "Could not generate summary.";
    }
};

export const findRelatedNotes = async (currentItem: VaultItem, allItems: VaultItem[]): Promise<{ relatedItems: { id: string, title: string, reason: string }[] } | null> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            relatedItems: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        reason: { type: Type.STRING },
                    }
                }
            }
        }
    };
    try {
        const context = `Current Item (ID: ${currentItem.id}, Title: ${currentItem.title}): "${currentItem.content.substring(0, 200)}..." \n\n All other items: ${JSON.stringify(allItems.filter(i => i.id !== currentItem.id).map(i => ({ id: i.id, title: i.title, content: i.content.substring(0, 100) + '...' })))}. Find up to 3 thematically related items from the list and provide a brief reason for the connection.`;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: context,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text);
    } catch (error) {
        console.error("Error finding related notes:", error);
        return null;
    }
};

export const generateTagsForItem = async (content: string, title: string): Promise<string[]> => {
    const schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };
    try {
        const prompt = `Generate up to 5 relevant, one-word or two-word tags for a vault item titled "${title}" with the content: "${content}"`;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text) || [];
    } catch (error) {
        console.error("Error generating tags:", error);
        return [];
    }
};

export const queryVault = async (query: string, items: VaultItem[]): Promise<string> => {
    try {
        const context = `You are a helpful AI assistant for a personal vault. Answer the user's query based *only* on the provided vault items. If the answer isn't in the items, say so. Vault items: ${JSON.stringify(items.map(i => ({ title: i.title, content: i.content })))}. Query: "${query}"`;
        const response = await ai.models.generateContent({ model: geminiModel, contents: context });
        return response.text;
    } catch (error) {
        console.error("Error querying vault:", error);
        return "I had trouble searching your vault. Please try again.";
    }
};

// --- CoreZen Functions ---
export const getMeditationScript = async (theme: string, details: string): Promise<string> => {
    try {
        const prompt = `Create a short, guided meditation script (around 150 words) for a theme of "${theme}". The script should be soothing, use simple language, and incorporate this specific guidance: "${details}"`;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { temperature: 0.7 }
        });
        return response.text;
    } catch(e) { return "Close your eyes. Breathe in. And breathe out. You are here, now."; }
};

export const getGroundingScript = async (): Promise<string> => {
    try {
        const prompt = `Create a short guided script for the 5-4-3-2-1 grounding technique. Guide the user to notice 5 things they can see, 4 things they can feel, 3 things they can hear, 2 things they can smell, and 1 thing they can taste. Keep it calm and simple.`;
        const response = await ai.models.generateContent({ model: geminiModel, contents: prompt });
        return response.text;
    } catch(e) { return "Look around you. Name five things you can see. Notice the details."; }
};


// --- CoreRift Functions ---
export const getDreamlikeNarration = async (content: string, sourceType: string): Promise<string> => {
    try {
        const prompt = `Create a short, surreal, dream-like narration (2-3 sentences) inspired by this piece of data from a user's "${sourceType}". The content is: "${content.substring(0, 300)}...". The tone should be mysterious and evocative.`;
        const response = await ai.models.generateContent({ model: geminiModel, contents: prompt, config: { temperature: 0.9 } });
        return response.text;
    } catch(e) { return "A whisper echoes from the void..."; }
};

export const generateDreamNode = async (context: string): Promise<Omit<RiftNode, 'id' | 'position' | 'state'> | null> => {
    const schema = { type: Type.OBJECT, properties: { label: {type: Type.STRING}, content: {type: Type.STRING}, color: {type: Type.STRING}, shape: {type: Type.STRING}, scale: {type: Type.NUMBER}}};
    try {
        const prompt = `Based on this user context: "${context}", generate a new "dream" node for the Rift. It should be abstract and strange. Provide a short label, longer content, a hex color, a shape (sphere, box, icosahedron, crystal, plant, door), and a scale (0.5-2.0).`;
         const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text);
    } catch(e) { return null; }
};

export const getCraftedNode = async (craftPrompt: string): Promise<Omit<RiftNode, 'id' | 'position' | 'state'> | null> => {
     const schema = { type: Type.OBJECT, properties: { label: {type: Type.STRING}, content: {type: Type.STRING}, color: {type: Type.STRING}, shape: {type: Type.STRING}, scale: {type: Type.NUMBER}}};
    try {
        const prompt = `A user wants to craft a node with the prompt: "${craftPrompt}". Interpret this creatively. Provide a short label, longer content based on the prompt, a hex color, a shape (sphere, box, icosahedron, crystal, plant, door), and a scale (0.5-2.0).`;
         const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text);
    } catch(e) { return null; }
};

export const getOracleRiddle = async (context: string): Promise<string> => {
    try {
        const prompt = `You are a mysterious oracle in the Rift. Based on this user context: "${context}", provide a short, cryptic, poetic riddle or prophecy (2-3 lines).`;
        const response = await ai.models.generateContent({ model: geminiModel, contents: prompt, config: { temperature: 1.0 } });
        return response.text.replace(/"/g, '');
    } catch(e) { return "The path forward is hidden in the path back."; }
};


// --- ExoCore Functions ---

export const analyzeThreatLog = async (logMessage: string): Promise<ThreatAnalysis | null> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            analysis: { type: Type.STRING, description: "A brief, one-sentence analysis of the potential threat." },
            recommendedAction: { type: Type.STRING, description: "A clear, one-sentence recommended action for the user." },
        }
    };
    try {
        const prompt = `You are a cybersecurity expert AI. Analyze this security log entry and provide a brief, one-sentence analysis of the potential threat and a clear, one-sentence recommended action. Log entry: "${logMessage}"`;
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return cleanAndParseJson(response.text);
    } catch (error) {
        console.error("Error analyzing threat log:", error);
        return null;
    }
};

export const transcribeAudio = async (audioBase64: string, audioMimeType: string): Promise<Pick<WatcherRecording, 'transcript' | 'summary' | 'keywords'>> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            transcript: { type: Type.STRING, description: "A verbatim transcript of the audio recording." },
            summary: { type: Type.STRING, description: "A concise one-sentence summary of the conversation." },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 3-5 main keywords from the conversation." },
        }
    };
    try {
        const audioPart = {
            inlineData: { data: audioBase64, mimeType: audioMimeType }
        };
        const textPart = {
            text: "You are a highly accurate speech transcription service. Your task is to process the following audio file. Provide a verbatim transcript. Additionally, as part of the transcription metadata, provide a concise one-sentence summary and 3-5 keywords that capture the main topics."
        };
        const response = await ai.models.generateContent({
            model: geminiModel,
            contents: { parts: [audioPart, textPart] },
            config: { responseMimeType: 'application/json', responseSchema: schema }
        });
        return cleanAndParseJson(response.text) || { transcript: 'Transcription failed.', summary: 'Could not summarize.', keywords: [] };
    } catch (e) {
        console.error("Error transcribing audio:", e);
        return { transcript: 'Processing failed.', summary: 'Could not summarize.', keywords: [] };
    }
};

export const suggestOpsChain = async (prompt: string): Promise<Pick<OpsChain, 'name' | 'trigger' | 'actions'> | null> => {
    // These definitions must match the ones in CoreOps.tsx to ensure consistency
    const validTriggers = {
        CoreSentinel: ['Intrusion Detected', 'Malicious App Blocked', 'Panic Switch Activated'],
        CoreWatcher: ['Recording Started', 'Recording Flagged Urgent', 'Storage Full'],
        CoreDreamer: ['Lucid Dream Initiated', 'Nightmare Detected'],
        CoreNexus: ['New Message in #urgent', 'Connection Request Received'],
    };
    const validActions = {
        CoreSentinel: ['Initiate Full Scan', 'Block App By Name', 'Enable Global Shield'],
        CoreWatcher: ['Start Ambient Recording', 'Wipe All Recordings'],
        CoreDreamer: ['Induce Calming Dream', 'Log Dream Fragment'],
        CoreNexus: ['Drop Message to Room', 'Disconnect All Users'],
        CoreOps: ['Enable/Disable Core', 'Isolate Core'],
    };
    
    const schema = {
        type: Type.OBJECT,
        required: ["name", "trigger", "actions"],
        properties: {
            name: { type: Type.STRING, description: "A short, descriptive name for the automation chain." },
            trigger: { 
                type: Type.OBJECT, 
                required: ["entity", "event"],
                properties: { 
                    entity: { type: Type.STRING, description: `The core that starts the chain. Must be one of: ${Object.keys(validTriggers).join(', ')}` }, 
                    event: { type: Type.STRING, description: "The event that starts the chain. Must be a valid event for the chosen entity." } 
                } 
            },
            actions: { 
                type: Type.ARRAY, 
                description: "An array containing exactly one action object.",
                items: { 
                    type: Type.OBJECT, 
                    required: ["entity", "action"],
                    properties: { 
                        entity: { type: Type.STRING, description: `The core that performs the action. Must be one of: ${Object.keys(validActions).join(', ')}` }, 
                        action: { type: Type.STRING, description: "The action to perform. Must be a valid action for the chosen entity." }, 
                        params: { type: Type.STRING, description: "Optional parameters for the action (e.g., an app name or message). Default to empty string if not specified." } 
                    } 
                } 
            },
        }
    };
    
    const promptText = `
        You are an expert automation rule generator for a system named Mirai. Your task is to interpret a user's natural language request and convert it into a structured JSON automation chain.
        You MUST strictly adhere to the provided list of entities, events, and actions. Do not invent new ones.

        Available Trigger Entities and their Events:
        ${JSON.stringify(validTriggers, null, 2)}

        Available Action Entities and their Actions:
        ${JSON.stringify(validActions, null, 2)}

        User's Request: "${prompt}"

        Based on the user's request, generate a JSON object that follows the defined schema. This object should contain:
        1.  A concise "name" for the automation.
        2.  A "trigger" object with the most appropriate "entity" and "event".
        3.  An "actions" array containing exactly ONE action object with its corresponding "entity", "action", and any "params" mentioned in the request. If no parameters are specified, "params" should be an empty string.
    `;
    
    try {
        const response = await ai.models.generateContent({ 
            model: geminiModel, 
            contents: promptText, 
            config: { responseMimeType: 'application/json', responseSchema: schema } 
        });
        return cleanAndParseJson(response.text);
    } catch (e) {
        console.error("Error suggesting Ops Chain:", e);
        return null;
    }
};

export const analyzeDream = async (content: string): Promise<{ symbols: DreamSymbol[], summary: string }> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING },
            symbols: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        symbol: { type: Type.STRING },
                        meaning: { type: Type.STRING },
                        context: { type: Type.STRING },
                    }
                }
            }
        }
    };
    try {
        const promptText = `Analyze this dream. Provide a one-sentence summary and identify up to 3 key symbols. For each symbol, provide its name, a possible meaning, and the specific context from the dream. Dream: "${content}"`;
        const response = await ai.models.generateContent({ model: geminiModel, contents: promptText, config: { responseMimeType: 'application/json', responseSchema: schema } });
        return cleanAndParseJson(response.text);
    } catch (e) {
        return { summary: 'Analysis failed.', symbols: [] };
    }
};

export const generateLucidScript = async (intention: string): Promise<string> => {
    try {
        const prompt = `Create a soothing, short (100 words) bedtime script to help a user have a lucid dream. The user's intention for the dream is: "${intention}". Use MILD technique (Mnemonic Induction of Lucid Dreams) by have them repeat a mantra.`;
        const response = await ai.models.generateContent({ model: geminiModel, contents: prompt });
        return response.text;
    } catch(e) { return "Tonight, I will realize I am dreaming."; }
};