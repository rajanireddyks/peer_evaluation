//src//pages/api/participant/invitelink.ts


import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, PrismaClient, JoinedVia } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const casdoorBaseUrl = process.env.NEXT_PUBLIC_CASDOOR_BASE_URL;
if (!casdoorBaseUrl) {
    throw new Error("NEXT_PUBLIC_CASDOOR_BASE_URL is not defined in .env");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

        if (req.method === 'POST') {
            return await generateInviteLink(req, res, user.id);
        } else if (req.method === 'PATCH') {
            return await addParticipantsManually(req, res);
        } else if (req.method === 'GET') {
            return await getParticipants(req, res);
        } else if (req.method === 'DELETE') {
            return await deleteParticipant(req, res);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error verifying token or handling request:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function generateInviteLink(req: NextApiRequest, res: NextApiResponse, userId: number) {
    const { activityId } = req.body;
    if (!activityId) return res.status(400).json({ error: 'Activity ID is required' });

    try {
        // Check if an invite link already exists for this activity
        const existingInvite = await prisma.inviteLink.findFirst({ where: { activityId } });
        if (existingInvite) {
            console.log("Existing invite found, returning existing link:", existingInvite.sharingLink);
            return res.status(200).json({ inviteLink: existingInvite.sharingLink });
        }

        // Generate new invite if none exists
        const inviteCode = Math.random().toString(36).substring(2, 10);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const inviteLink = `${baseUrl}/join/${inviteCode}`;

        const newInvite = await prisma.inviteLink.create({
            data: {
                activityId,
                sharingLink: inviteLink,
                sharedById: userId,
                receivedBy: Prisma.JsonNull, // Use Prisma.JsonNull instead of null
              },
            });
          
            await prisma.participantSubmission.create({
                data: {
                  activityId,
                  userId, // the creator's ID
                  joinedVia: JoinedVia.MANUAL, // or whichever enum value suits your use-case
                },
              });              


        console.log("New invite link generated:", newInvite.sharingLink);
        return res.status(201).json({ inviteLink: newInvite.sharingLink });
    } catch (error) {
        console.error('Error generating invite link:', error);
        return res.status(500).json({ error: 'Failed to generate invite link' });
    }
}


async function addParticipantsManually(req: NextApiRequest, res: NextApiResponse) {
    const { activityId, participantEmails } = req.body;
    if (!activityId || !participantEmails || !Array.isArray(participantEmails)) {
        return res.status(400).json({ error: 'Invalid request parameters' });
    }

    try {
        const users = await prisma.user.findMany({
            where: { email: { in: participantEmails } },
        });

        const existingUserIds = users.map(user => user.id);
        const invalidEmails = participantEmails.filter(email => !users.find(user => user.email === email));

        if (invalidEmails.length > 0) {
            return res.status(400).json({ error: 'Some emails are not registered users', invalidEmails });
        }

        const participantEntries = existingUserIds.map(id => ({
            activityId,
            userId: id,
            joinedVia: JoinedVia.MANUAL,
        }));

        await prisma.participantSubmission.createMany({ data: participantEntries });
        return res.status(201).json({ message: 'Participants added successfully' });
    } catch (error) {
        console.error('Error adding participants:', error);
        return res.status(500).json({ error: 'Failed to add participants' });
    }
}

async function getParticipants(req: NextApiRequest, res: NextApiResponse) {
    const { activityId } = req.query;
    if (!activityId) return res.status(400).json({ error: 'Activity ID is required' });

    try {
        const participants = await prisma.participantSubmission.findMany({
            where: { activityId: Number(activityId) },
            include: { user: true },
        });
        return res.status(200).json(participants);
    } catch (error) {
        console.error('Error fetching participants:', error);
        return res.status(500).json({ error: 'Failed to fetch participants' });
    }
}

async function deleteParticipant(req: NextApiRequest, res: NextApiResponse) {
    const { activityId, userId } = req.body;
    if (!activityId || !userId) return res.status(400).json({ error: 'Activity ID and User ID are required' });

    try {
        await prisma.participantSubmission.deleteMany({
            where: { activityId: Number(activityId), userId: Number(userId) },
        });
        return res.status(200).json({ message: 'Participant removed successfully' });
    } catch (error) {
        console.error('Error deleting participant:', error);
        return res.status(500).json({ error: 'Failed to remove participant' });
    }
}



































// export async function joinActivityViaLink(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

//     const { inviteCode, userId } = req.body;
//     console.log("Received request to join with inviteCode:", inviteCode, "and userId:", userId);
    
//     if (!inviteCode || !userId) return res.status(400).json({ error: 'Invite code and user ID are required' });

//     try {
//         // Log the full URL being searched
//         const expectedLink = `${process.env.NEXT_PUBLIC_BASE_URL}/join/${inviteCode}`;
//         console.log("Searching for invite link:", expectedLink);

//         const invite = await prisma.inviteLink.findUnique({ where: { sharingLink: expectedLink } });
//         console.log("Invite found in database:", invite);

//         if (!invite) return res.status(404).json({ error: 'Invalid invite link' });

//         await prisma.inviteLink.update({
//             where: { id: invite.id },
//             data: { status: 'JOINED', receivedById: userId },
//         });
//         console.log("Updated invite link status to JOINED");

//         await prisma.participantSubmission.create({
//             data: {
//                 activityId: invite.activityId,
//                 userId,
//                 joinedVia: JoinedVia.LINK,
//             },
//         });
//         console.log("Participant entry created in participantSubmission table");

//         return res.status(200).json({ message: 'Joined activity successfully' });
//     } catch (error) {
//         console.error('Error joining activity via link:', error);
//         return res.status(500).json({ error: 'Failed to join activity' });
//     }
// }

// async function getParticipants(req: NextApiRequest, res: NextApiResponse) {
//     const { activityId } = req.query;
//     if (!activityId) return res.status(400).json({ error: 'Activity ID is required' });

//     try {
//         const participants = await prisma.participantSubmission.findMany({
//             where: { activityId: Number(activityId) },
//             include: { user: true },
//         });
//         return res.status(200).json(participants);
//     } catch (error) {
//         console.error('Error fetching participants:', error);
//         return res.status(500).json({ error: 'Failed to fetch participants' });
//     }
// }

// async function deleteParticipant(req: NextApiRequest, res: NextApiResponse) {
//     const { activityId, userId } = req.body;
//     if (!activityId || !userId) return res.status(400).json({ error: 'Activity ID and User ID are required' });

//     try {
//         await prisma.participantSubmission.deleteMany({
//             where: { activityId: Number(activityId), userId: Number(userId) },
//         });
//         return res.status(200).json({ message: 'Participant removed successfully' });
//     } catch (error) {
//         console.error('Error deleting participant:', error);
//         return res.status(500).json({ error: 'Failed to remove participant' });
//     }
// }










// //  6tqzj4@example.com
// //	k9mckf@example.com
// // http://localhost:3000/join/g0in2ibq