import axios, { AxiosResponse } from 'axios';
import express, { query } from 'express';
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 3600 * 8 });
export const router = express.Router();

const fetchToken = async () => {
    const cacheKey = `${process.env.GPT_ROBOT_API_ID}-jwtToken`;
    let token = cache.get<string>(cacheKey);
    if (!token) {
        const authenticationData = {
            query: `query Authentication($input: JWTInput!) {
                authentication(input: $input) {
                  jwt
                  profile {
                    bio
                    avatar
                    friendlyName
                    openId
                    snsName
                  }
                }
              }`,

            variables: {
                "input": {
                    "accessToken": process.env.GPT_ROBOT_API_KEY,
                    "clientId": process.env.GPT_ROBOT_API_ID,
                    "provider": "api-client"
                }
            },
        };

        const authenticationConfig = {
            method: 'post',
            url: process.env.GRAPHQL_SERVER,
            headers: {
                'Content-Type': 'application/json',
            },
            data: authenticationData
        };

        const authenticationResponse: AxiosResponse = await axios(authenticationConfig);
        token = authenticationResponse.data.data.authentication.jwt;
        cache.set(cacheKey, token);
    }
    return token;
}

router.post('/azure', express.json(), async (req, res) => {

    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
            const accessToken = authHeader.slice(7).trim();
            if (accessToken !== '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') {
                res.status(401).send('Unauthorized');
            }
        }

        const { post, mentionHistory } = req.body;

        const openAIData = JSON.stringify({
            "messages": [
                {
                    "role": "user",
                    "content": post.content,
                }
            ],
        });

        const openAIConfig = {
            method: 'post',
            url: process.env.OPENAI_ENDPOINT_URL,
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.OPENAI_API_KEY
            },
            data: openAIData
        };

        const openAIResponse: AxiosResponse = await axios(openAIConfig);

        const commentMessage = openAIResponse.data.choices[0].message.content;
        const jwt = await fetchToken();

        const commentData = {
            query: `mutation CreateComment($input: CreateCommentInput!) {
                createComment(input: $input) {
                  id
                  content
                  createdAt
                  updatedAt
                }
              }`,

            variables: {
                "input": {
                    "content": commentMessage,
                    "postId": post.id.toString(),
                }
            },
        };

        const commentConfig = {
            method: 'post',
            url: process.env.GRAPHQL_SERVER,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`,
            },
            data: commentData
        };

        const commentResponse: AxiosResponse = await axios(commentConfig);

        res.send(commentResponse.data);
    }
    catch (error) {
        console.log(error);
        res.send(error);
    }
});