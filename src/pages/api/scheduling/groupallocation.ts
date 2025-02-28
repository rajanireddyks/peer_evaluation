// src/pages/api/scheduling/groupallocation.ts
//allocate should work only for the user who created this activity not for everyone
//once the activity is finalized the user who created the activity will not have the anu edit access for this activity becuase that user will alos be a participant that's why
//after finalize the link should be there but no one can join


import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, EvaluationType, SessionStatus, EvaluationStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const casdoorBaseUrl = process.env.NEXT_PUBLIC_CASDOOR_BASE_URL;
if (!casdoorBaseUrl) {
  throw new Error("NEXT_PUBLIC_CASDOOR_BASE_URL is not defined in .env");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate the user as in joinlink.ts
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const userInfoResponse = await axios.get(`${casdoorBaseUrl}/api/user`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const userData = userInfoResponse.data;
    if (!userData?.id) {
      return res.status(403).json({ error: 'Invalid access token' });
    }
    const user = await prisma.user.findUnique({ where: { uuid: userData.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Expect a query parameter "action" to determine the operation.
    // e.g., /api/groupallocation?action=allocate OR ?action=finalize
    const { action } = req.query;
    if (!action) {
      return res.status(400).json({ error: 'Action is required in query parameter' });
    }
    
    if (action === 'allocate') {
      return await allocateGroups(req, res, user.id);
    } else if (action === 'finalize') {
      return await finalizeAllocation(req, res, user.id);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error in group allocation:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function allocateGroups(req: NextApiRequest, res: NextApiResponse, userId: number) {
  console.log("allocateGroups called by user:", userId);
  
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 1. Delete all existing groups for this session
    await prisma.group.deleteMany({
      where: { sessionId: session.id },
    });

    // 2. Fetch participants, shuffle them, and build the new groups
    const participants = await prisma.participantSubmission.findMany({
      where: { activityId: session.activityId },
    });
    if (participants.length === 0) {
      return res.status(400).json({ error: 'No participants found for this activity' });
    }
    
    const participantIds = participants.map(p => p.userId);
    const shuffled = participantIds.sort(() => Math.random() - 0.5);
    
    const groupSize = session.groupSize;
    const groups = [];
    for (let i = 0; i < shuffled.length; i += groupSize) {
      groups.push(shuffled.slice(i, i + groupSize));
    }

    // 3. Create the new groups
    const createdGroups = [];
    for (let i = 0; i < groups.length; i++) {
      const groupData = {
        sessionId: session.id,
        activityId: session.activityId,
        groupName: `Group ${i + 1}`,
        groupMembers: groups[i],
      };
      const group = await prisma.group.create({
        data: groupData,
      });
      createdGroups.push(group);
    }

    return res.status(200).json({ message: 'Groups allocated successfully', groups: createdGroups });
  } catch (error) {
    console.error('Error allocating groups:', error);
    return res.status(500).json({ error: 'Failed to allocate groups' });
  }
}


async function finalizeAllocation(req: NextApiRequest, res: NextApiResponse, userId: number) {
  // Log userId to resolve unused parameter warning
  console.log("finalizeAllocation called by user:", userId);

  // Expect sessionId in the request body.
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  try {
    // Fetch the session along with its groups
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { groups: true },
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Expire the invite link so no one can join anymore.
    await prisma.inviteLink.updateMany({
      where: { activityId: session.activityId },
      data: { sharingLink: '' },
    });
    
    // Update the session status to ACTIVE.
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.ACTIVE },
    });
    
    // For each group, update the finalizedAt timestamp.
    const updatedGroups = [];
    for (const group of session.groups) {
      const updatedGroup = await prisma.group.update({
        where: { id: group.id },
        data: { finalizedAt: new Date() },
      });
      updatedGroups.push(updatedGroup);
    }
    
    // Create evaluation records based on the evaluation type.
    const evaluationRecords = [];
    const evaluationType = session.evaluationType;
    
    if (evaluationType === EvaluationType.WITHIN_GROUP) {
      // Each member evaluates every other member within the same group.
      for (const group of session.groups) {
        const members: number[] = group.groupMembers as number[];
        for (let i = 0; i < members.length; i++) {
          for (let j = 0; j < members.length; j++) {
            if (i !== j) {
              evaluationRecords.push({
                activityId: session.activityId,
                sessionId: session.id,
                evaluatorId: members[i],
                evaluateeId: members[j],
                groupId: group.id,
                marks: 0,
                status: EvaluationStatus.PENDING,
                isSubmitted: false,
                isReviewed: false,
              });
            }
          }
        }
      }
    } else if (evaluationType === EvaluationType.GROUP_TO_GROUP) {
      // Pair groups in a circular fashion: group[i] evaluates group[(i+1)%n]
      const groupsArr = session.groups;
      const totalGroups = groupsArr.length;
      for (let i = 0; i < totalGroups; i++) {
        const evaluatorGroup = groupsArr[i];
        const evaluateeGroup = groupsArr[(i + 1) % totalGroups];
        const evaluatorMembers: number[] = evaluatorGroup.groupMembers as number[];
        const evaluateeMembers: number[] = evaluateeGroup.groupMembers as number[];
        for (const evaluatorId of evaluatorMembers) {
          for (const evaluateeId of evaluateeMembers) {
            evaluationRecords.push({
              activityId: session.activityId,
              sessionId: session.id,
              evaluatorId,
              evaluateeId,
              groupId: evaluatorGroup.id, // or set to evaluateeGroup.id per your design
              marks: 0,
              status: EvaluationStatus.PENDING,
              isSubmitted: false,
              isReviewed: false,
            });
          }
        }
      }
    } else if (evaluationType === EvaluationType.ANY_TO_ANY) {
      // Every participant evaluates every other participant across groups.
      const allMembers = session.groups.reduce((acc: number[], group) => {
        return acc.concat(group.groupMembers as number[]);
      }, []);
      for (let i = 0; i < allMembers.length; i++) {
        for (let j = 0; j < allMembers.length; j++) {
          if (i !== j) {
            evaluationRecords.push({
              activityId: session.activityId,
              sessionId: session.id,
              evaluatorId: allMembers[i],
              evaluateeId: allMembers[j],
              groupId: 0, // set default group id for cross-group evaluation
              marks: 0,
              status: EvaluationStatus.PENDING,
              isSubmitted: false,
              isReviewed: false,
            });
          }
        }
      }
    }
    
    // Bulk insert all evaluation records (if any).
    if (evaluationRecords.length > 0) {
      await prisma.evaluation.createMany({
        data: evaluationRecords,
      });
    }
    
    return res.status(200).json({ message: 'Allocation finalized successfully', groups: updatedGroups });
  } catch (error) {
    console.error('Error finalizing allocation:', error);
    return res.status(500).json({ error: 'Failed to finalize allocation' });
  }
}
