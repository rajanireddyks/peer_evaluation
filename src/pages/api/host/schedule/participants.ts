//src/pages/api/host/schedule/participants.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if(req.method === 'POST'){
      const { activityId, participants } = req.body; // participants: [{ email, joinedVia }]
      console.log("POST ParticipantSubmission with body:", req.body);
      const createdSubmissions = [];
      for(const participant of participants){
        // Find the user by email (email is unique)
        const user = await prisma.user.findUnique({
          where: { email: participant.email }
        });
        if(user){
          const submission = await prisma.participantSubmission.create({
            data: {
              activityId,
              userId: user.id,
              joinedVia: participant.joinedVia,
            }
          });
          createdSubmissions.push(submission);
        } else {
          console.log("User not found for email:", participant.email);
        }
      }
      return res.status(201).json({ submissions: createdSubmissions });
    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch(error) {
    console.error("ParticipantSubmission API Error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}

