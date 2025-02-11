//src/pages/api/rubric/rubrics.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
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

    if (req.method === 'POST') {
      return await createRubric(req, res);
    } else if (req.method === 'GET') {
      return await getRubrics(req, res);
    } else if (req.method === 'PUT') {
      return await updateRubric(req, res);
    } else if (req.method === 'PATCH') {
      return await partialUpdateRubric(req, res);
    } else if (req.method === 'DELETE') {
      return await deleteRubric(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error verifying token or handling request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST: Create a new rubric
async function createRubric(req: NextApiRequest, res: NextApiResponse) {
  const { activityId, criteria, criteriaMarks } = req.body;

  if (!activityId) {
    return res.status(400).json({ error: 'activityId is required' });
  }

  try {
    const newRubric = await prisma.rubric.create({
      data: {
        activityId,
        criteria: criteria ?? {},
        criteriaMarks: criteriaMarks ?? {},
      },
    });

    return res.status(201).json(newRubric);
  } catch (error) {
    console.error('Error creating rubric:', error);
    return res.status(500).json({ error: 'Failed to create rubric' });
  }
}

// GET: Fetch rubrics, optionally filter by activityId
async function getRubrics(req: NextApiRequest, res: NextApiResponse) {
  const { activityId } = req.query;

  try {
    const rubrics = await prisma.rubric.findMany({
      where: activityId ? { activityId: Number(activityId) } : {},
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(rubrics);
  } catch (error) {
    console.error('Error fetching rubrics:', error);
    return res.status(500).json({ error: 'Failed to fetch rubrics' });
  }
}

//PUT 
async function updateRubric(req: NextApiRequest, res: NextApiResponse) {
  const { rubricId, activityId, criteria, criteriaMarks } = req.body;

  if (!rubricId) {
    return res.status(400).json({ error: 'rubricId is required' });
  }

  try {
    // Check if the rubric exists
    const existingRubric = await prisma.rubric.findUnique({
      where: { rubricId: Number(rubricId) },
    });

    if (!existingRubric) {
      return res.status(404).json({ error: 'Rubric not found' });
    }

    // Perform the update
    const updatedRubric = await prisma.rubric.update({
      where: { rubricId: Number(rubricId) },
      data: { activityId, criteria, criteriaMarks },
    });

    return res.status(200).json(updatedRubric);
  } catch (error) {
    console.error('Error updating rubric:', error);
    return res.status(500).json({ error: 'Failed to update rubric' });
  }
}




// PATCH: Partially update a rubric
async function partialUpdateRubric(req: NextApiRequest, res: NextApiResponse) {
  const { rubricId, ...updateFields } = req.body;

  if (!rubricId) {
    return res.status(400).json({ error: 'rubricId is required' });
  }

  try {
    const updatedRubric = await prisma.rubric.update({
      where: { rubricId },
      data: { ...updateFields },
    });

    return res.status(200).json(updatedRubric);
  } catch (error) {
    console.error('Error patching rubric:', error);
    return res.status(500).json({ error: 'Failed to update rubric' });
  }
}

// DELETE: Delete a rubric
async function deleteRubric(req: NextApiRequest, res: NextApiResponse) {
  const { rubricId } = req.query;

  if (!rubricId) {
    return res.status(400).json({ error: 'rubricId is required' });
  }

  try {
    const deletedRubric = await prisma.rubric.delete({
      where: { rubricId: Number(rubricId) },
    });

    return res.status(200).json({ message: 'Rubric deleted successfully', deletedRubric });
  } catch (error) {
    console.error('Error deleting rubric:', error);
    return res.status(500).json({ error: 'Failed to delete rubric' });
  }
}
