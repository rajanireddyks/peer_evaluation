//src/pages/api/auth/callback.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        console.log('Invalid request method:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;
    if (!code) {
        console.log('Missing authorization code in request body');
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        console.log('Received authorization code:', code);

        const tokenResponse = await axios.post(
            process.env.CASDOOR_TOKEN_URL as string,
            {
                client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
                client_secret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }
        );

        console.log('Token response received:', tokenResponse.data);

        const accessToken = tokenResponse.data?.access_token;
        if (!accessToken) {
            console.log('Access token not received in response');
            throw new Error('Access token not received');
        }

        console.log('Access token:', accessToken);

        const decodedToken = jwt.decode(accessToken);
        console.log('Decoded token:', decodedToken);

        if (!decodedToken || typeof decodedToken !== 'object') {
            console.log('Invalid token payload');
            throw new Error('Invalid token payload');
        }

        const { name: username, email, sub: uuid } = decodedToken;
        console.log('Extracted user data from token:', { username, email, uuid });

        if (!username || !email || !uuid) {
            console.log('Missing required user data in token');
            throw new Error('Missing user data in token');
        }

        console.log('Upserting user into database...');
        const user = await prisma.user.upsert({
            where: { uuid }, 
            update: { username, email, updatedAt: new Date() },
            create: {
                uuid, 
                username,
                email,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        console.log('User upserted successfully:', user);
        await prisma.$disconnect();
        console.log('Prisma client disconnected');

        return res.status(200).json({
            success: true,
            user,
            accessToken, // Send access token to the frontend
        });
    } catch (error) {
        console.error('Authentication Error:', error);
        await prisma.$disconnect();
        return res.status(500).json({
            error: 'Authentication failed',
            details: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
}






