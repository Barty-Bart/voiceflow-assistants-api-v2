
//This file contains the route definitions and the logic for handling requests to those routes

const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

// Load API key from environment variables
const TOKEN = process.env.OPENAI_API_KEY;

// Utility function to trim whitespace from all string properties of an object
function trimObjectStrings(obj) {
    const trimmedObj = {};
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            trimmedObj[key] = obj[key].trim();
        } else {
            trimmedObj[key] = obj[key];
        }
    }
    return trimmedObj;
}

// Define a POST endpoint for '/chat'
router.post('/chat', async (req, res) => {
       // Handle the chat request
    try {
        // Trim whitespace from input variables and log them
        const { thread_id, userMessage, assistant_id } = trimObjectStrings(req.body);
        console.log('Thread ID:', thread_id);
        console.log('User Message:', userMessage);
        console.log('User Message:', assistant_id);
        
        let threadID = thread_id;
        let message = userMessage;
        let assistantID = assistant_id;
        
        // Check if threadID does not match the pattern
        if (!threadID.match(/^thread_/)) {
            // Part 1: Create a new thread
            console.log("Part 1: Create a new thread");
            const createThreadResponse = await axios.post('https://api.openai.com/v1/threads', {}, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            threadID = createThreadResponse.data.id;
        }

        // Part 2: Add message to thread
        console.log("Part 2: Add message to thread");
        await axios.post(`https://api.openai.com/v1/threads/${threadID}/messages`,
            JSON.stringify({
                role: 'user',
                content: message // Using the extracted and trimmed userMessage
            }), 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        );

        // Part 3: Create a run
        console.log("Part 3: Create a run");
        const createRunResponse = await axios.post(`https://api.openai.com/v1/threads/${threadID}/runs`,
            JSON.stringify({
                assistant_id: assistantID
            }), 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        );
        const runID = createRunResponse.data.id;

        // Part 4 and Part 5: Get run status and check if completed
        console.log("Part 4 and Part 5: Get run status and check if completed");
        let runStatus;
        let numChecks = 0; // Initialize check counter
        const maxChecks = 30; // Max number of checks
        do {
            if (numChecks >= maxChecks) {
                throw new Error('Max number of checks reached, run status check aborted.');
            }
            const getRunStatusResponse = await axios.get(`https://api.openai.com/v1/threads/${threadID}/runs/${runID}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            runStatus = getRunStatusResponse.data.status;
            console.log("Run Status:", runStatus);

            if (runStatus === 'completed') break;
            if (runStatus === 'failed' || runStatus === 'cancelled') {
                throw new Error(`Run failed with status: ${runStatus}`);
            }
            numChecks++; // Increment check counter
            
            // Wait for a short period before checking the status again
            await new Promise(resolve => setTimeout(resolve, 1000));
        } while (runStatus === 'in_progress' || runStatus === 'queued');

        // Part 6: Get response from thread
        console.log("Part 6: Get response from thread");
        const getMessagesResponse = await axios.get(`https://api.openai.com/v1/threads/${threadID}/messages`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`,
                'OpenAI-Beta': 'assistants=v2'
            }
        });
        const threadResponse = getMessagesResponse.data.data[0].content[0].text.value;

        // Return the response back to the invoking API call
        res.json({ threadResponse, threadID });
    } catch (error) {
        console.error('Error handling chat request:', error.message);
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

module.exports = router;


