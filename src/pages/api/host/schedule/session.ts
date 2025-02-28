//src/pages/api/host/schedule/session.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'POST') {
      // Create a new schedule (session) record
      console.log("POST schedule request with body:", req.body);
      const { activityId, startTime, endTime, duration, status, scheduledAt, evaluationType, groupSize, totalStudents } = req.body;
      
      const session = await prisma.session.create({
        data: {
          activityId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          duration,
          status,
          scheduledAt: new Date(scheduledAt),
          evaluationType,
          groupSize,
          totalStudents,
        },
      });
      console.log("Session created:", session);
      return res.status(201).json(session);
    } else if (req.method === 'PUT') {
      // Update an existing schedule (session) record
      console.log("PUT schedule request with body:", req.body);
      const { id, activityId, startTime, endTime, duration, status, scheduledAt, evaluationType, groupSize, totalStudents } = req.body;
      const session = await prisma.session.update({
        where: { id },
        data: {
          activityId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          duration,
          status,
          scheduledAt: new Date(scheduledAt),
          evaluationType,
          groupSize,
          totalStudents,
        },
      });
      console.log("Session updated:", session);
      return res.status(200).json(session);
    } else {
      res.setHeader('Allow', ['POST', 'PUT']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("Schedule API Error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
