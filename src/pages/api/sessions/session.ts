//src/pages/api/sessions/session.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
//import { PrismaClient, SessionStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.headers.authorization?.split(' ')[1];

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify the access token by calling the external API
    const userInfoResponse = await axios({
      method: 'get',
      url: 'https://authtest.cialabs.org/api/user',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    const userData = userInfoResponse.data;
    if (!userData?.id) {
      return res.status(403).json({ error: 'Invalid access token' });
    }

    // Handle API methods
    if (req.method === 'POST') {
      return await createSession(req, res);
    } else if (req.method === 'GET') {
      return await getSessions(req, res);
    } else if (req.method === 'PUT') {
      return await updateSession(req, res);
    } else if (req.method === 'PATCH') {
      return await partialUpdateSession(req, res);
    } else if (req.method === 'DELETE') {
      return await deleteSession(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error verifying token or handling request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST: Create a new session
async function createSession(req: NextApiRequest, res: NextApiResponse) {
  const { activityId, startTime, endTime, duration, status } = req.body;

  if (!activityId || !status) {
    return res.status(400).json({ error: 'activityId and status are required' });
  }

  try {
    const newSession = await prisma.session.create({
      data: {
        activityId,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        duration: duration ?? null,
        status,
      },
    });

    return res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
}

// GET: Fetch all sessions or filter by activityId
async function getSessions(req: NextApiRequest, res: NextApiResponse) {
  const { activityId } = req.query;

  try {
    const sessions = await prisma.session.findMany({
      where: activityId ? { activityId: Number(activityId) } : {},
      orderBy: { scheduledAt: 'desc' },
    });

    return res.status(200).json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

// PUT: Update a session completely
async function updateSession(req: NextApiRequest, res: NextApiResponse) {
  const { id, activityId, startTime, endTime, duration, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        activityId,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        duration,
        status,
      },
    });

    return res.status(200).json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ error: 'Failed to update session' });
  }
}

// PATCH: Partially update a session
async function partialUpdateSession(req: NextApiRequest, res: NextApiResponse) {
  const { id, ...updateFields } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const updatedSession = await prisma.session.update({
      where: { id },
      data: updateFields,
    });

    return res.status(200).json(updatedSession);
  } catch (error) {
    console.error('Error patching session:', error);
    return res.status(500).json({ error: 'Failed to update session' });
  }
}

// DELETE: Delete a session
async function deleteSession(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const deletedSession = await prisma.session.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({ message: 'Session deleted successfully', deletedSession });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ error: 'Failed to delete session' });
  }
}
