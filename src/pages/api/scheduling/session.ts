// src/pages/api/scheduling/session.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, EvaluationType, SessionStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const casdoorBaseUrl = process.env.NEXT_PUBLIC_CASDOOR_BASE_URL;
if (!casdoorBaseUrl) {
  throw new Error("NEXT_PUBLIC_CASDOOR_BASE_URL is not defined in .env");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate the user via CASDoor
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify token & get user info from Casdoor
    const userInfoResponse = await axios.get(`${casdoorBaseUrl}/api/user`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const userData = userInfoResponse.data;
    if (!userData?.id) {
      return res.status(403).json({ error: 'Invalid access token' });
    }

    // Find user in local DB
    const user = await prisma.user.findUnique({ where: { uuid: userData.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Route by method
    if (req.method === 'POST') {
      return await scheduleSession(req, res, user.id);
    } else if (req.method === 'GET') {
      return await getSessions(req, res, user.id);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in session scheduling:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function scheduleSession(req: NextApiRequest, res: NextApiResponse, userId: number) {
  console.log("Scheduling session for user:", userId);

  // Expect the following fields in the body:
  // activityId, startTime, endTime, evaluationType, groupSize
  const { activityId, startTime, endTime, evaluationType, groupSize } = req.body;
  if (!activityId || !startTime || !endTime || !evaluationType || !groupSize) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate evaluationType
  if (!Object.values(EvaluationType).includes(evaluationType)) {
    return res.status(400).json({ error: 'Invalid evaluation type' });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  if (end <= start) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }

  const duration = Math.floor((end.getTime() - start.getTime()) / 60000); // in minutes

  try {
    // Count how many participants are in this activity
    const totalStudents = await prisma.participantSubmission.count({
      where: { activityId },
    });

    // Create a new session record
    const session = await prisma.session.create({
      data: {
        activityId,
        startTime: start,
        endTime: end,
        duration,
        status: SessionStatus.PENDING,
        scheduledAt: new Date(),
        evaluationType,
        groupSize,
        totalStudents,
      },
    });

    return res.status(200).json({
      message: 'Session scheduled successfully',
      session,
    });
  } catch (error) {
    console.error('Error scheduling session:', error);
    return res.status(500).json({ error: 'Failed to schedule session' });
  }
}

/**
 * GET sessions for a specific activity.
 * Example usage: GET /api/scheduling/session?activityId=4
 */
async function getSessions(req: NextApiRequest, res: NextApiResponse, userId: number) {
  console.log("Fetching sessions for user:", userId);

  // Read the activityId from query parameters
  const { activityId } = req.query;
  if (!activityId) {
    return res.status(400).json({ error: 'activityId query param is required' });
  }

  try {
    // Convert to number if needed
    const activityIdNum = Number(activityId);
    if (isNaN(activityIdNum)) {
      return res.status(400).json({ error: 'activityId must be a valid number' });
    }

    // Fetch sessions for that activity
    const sessions = await prisma.session.findMany({
      where: { activityId: activityIdNum },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
