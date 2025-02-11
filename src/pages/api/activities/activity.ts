//src/pages/api/activities/activity.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

const casdoorBaseUrl = process.env.CASDOOR_BASE_URL;
if (!casdoorBaseUrl) {
    throw new Error("CASDOOR_BASE_URL is not defined in .env");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const userInfoResponse = await axios.get(`${casdoorBaseUrl}/api/user`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
    });
    const userData = userInfoResponse.data;
    if (!userData?.id) {
      return res.status(403).json({ error: 'Invalid access token' });
    }

    console.log("API called with method:", req.method);
    console.log("Request body:", req.body);


    if (req.method === 'POST') {
      return await createActivityWithRubric(req, res, userData.id);
    } else if (req.method === 'GET') {
      return await getActivities(req, res);
    } else if (req.method === 'PATCH') {
      return await partialUpdateActivity(req, res);
    } else if (req.method === 'DELETE') {
      return await deleteActivity(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error verifying token or handling request:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST: Create Activity and Rubric
async function createActivityWithRubric(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
  const { activityName, metadata, createdWithRole, rubricCriteria, maxMarks } = req.body;

  if (!activityName || !userUUID || !createdWithRole) {
    return res.status(400).json({ error: 'activityName, userUUID, and createdWithRole are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newActivity = await prisma.activity.create({
      data: {
        activityName,
        createdById: user.id,
        createdWithRole,
        metadata: metadata ?? {},
      },
    });

    if (rubricCriteria && maxMarks) {
      const formattedCriteria: Prisma.JsonValue = rubricCriteria as string[];
      const formattedMaxMarks: Prisma.JsonValue = maxMarks as Record<string, number>;

      await prisma.rubric.create({
        data: {
          activityId: newActivity.id,
          criteria: formattedCriteria,
          maxMarks: formattedMaxMarks,
        },
      });
    }

    if (createdWithRole === 'PARTICIPANT') {
      const shareableLink = `https://peer-eval.app/join/${nanoid(10)}`;
      await prisma.inviteLink.create({
        data: {
          activityId: newActivity.id,
          sharingLink: shareableLink,
          sharedById: user.id,
          receivedById: user.id,
          status: 'PENDING',
        },
      });
    }

    return res.status(201).json(newActivity);
  } catch (error) {
    console.error('Error creating activity and rubric:', error);
    return res.status(500).json({ error: 'Failed to create activity' });
  }
}

// GET: Fetch Activities
async function getActivities(req: NextApiRequest, res: NextApiResponse) {
  try {
    const activities = await prisma.activity.findMany({
      include: { rubrics: true, inviteLinks: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
}

async function partialUpdateActivity(req: NextApiRequest, res: NextApiResponse) {
  const { id, activityName, metadata, rubricCriteria, maxMarks } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Activity ID is required' });
  }

  try {
    const updateData: Prisma.ActivityUpdateInput = {};

    // Update activity name if provided
    if (activityName) {
      updateData.activityName = activityName;
    }

    // Update metadata if provided
    if (metadata) {
      updateData.metadata = metadata;
    }

    // Perform Activity update if any fields are present
    if (Object.keys(updateData).length > 0) {
      await prisma.activity.update({
        where: { id },
        data: updateData,
      });
    }

    // Update Rubric fields selectively
if (rubricCriteria || maxMarks) {
  const existingRubric = await prisma.rubric.findFirst({
    where: { activityId: id },
  });

  if (existingRubric) {
    // Use new criteria if provided, otherwise keep existing ones
    const updatedCriteria = rubricCriteria ?? (existingRubric.criteria as string[]);

    // Replace maxMarks instead of merging
    const updatedMaxMarks = maxMarks ?? (existingRubric.maxMarks as Record<string, number>);

    await prisma.rubric.update({
      where: { id: existingRubric.id },
      data: {
        criteria: updatedCriteria,
        maxMarks: updatedMaxMarks,
      },
    });
  }
}


    return res.status(200).json({ message: 'Activity updated successfully' });
  } catch (error) {
    console.error('Error updating activity and rubric:', error);
    return res.status(500).json({ error: 'Failed to update activity' });
  }
}


// DELETE: Remove entire activity or just a specific criterion from an activity's rubric
async function deleteActivity(req: NextApiRequest, res: NextApiResponse) {
  const { id, criterion } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Activity ID is required' });
  }

  try {
    if (criterion) {
  // Ensure criterion is a single string
  const criterionStr = Array.isArray(criterion) ? criterion[0] : criterion; 

  // Find existing rubric
  const existingRubric = await prisma.rubric.findFirst({
    where: { activityId: Number(id) },
  });

  if (!existingRubric) {
    return res.status(404).json({ error: 'Rubric not found for the activity' });
  }

  // Remove the specified criterion from the criteria list
  const updatedCriteria = (existingRubric.criteria as string[]).filter(c => c !== criterionStr);

  // Ensure maxMarks is treated as a Record<string, number>
  const existingMaxMarks = existingRubric.maxMarks as Record<string, number>;

  // Remove the corresponding maxMarks entry
  const updatedMaxMarks = { ...existingMaxMarks };
  delete updatedMaxMarks[criterionStr]; // Avoids ESLint warning

  await prisma.rubric.update({
    where: { id: existingRubric.id },
    data: {
      criteria: updatedCriteria,
      maxMarks: updatedMaxMarks, // Ensure consistency
    },
  });

  return res.status(200).json({ message: `Criterion '${criterionStr}' removed successfully` });
}

     else {
      // Delete the entire activity and related records
      await prisma.rubric.deleteMany({ where: { activityId: Number(id) } });
      await prisma.inviteLink.deleteMany({ where: { activityId: Number(id) } });
      const deletedActivity = await prisma.activity.delete({ where: { id: Number(id) } });

      return res.status(200).json({ message: 'Activity deleted successfully', deletedActivity });
    }
  } catch (error) {
    console.error('Error deleting activity or criterion:', error);
    return res.status(500).json({ error: 'Failed to delete activity or criterion' });
  }
}
















































// import { NextApiRequest, NextApiResponse } from 'next';
// import { PrismaClient } from '@prisma/client';
// import axios from 'axios';

// const prisma = new PrismaClient();

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const accessToken = req.headers.authorization?.split(' ')[1];

//   if (!accessToken) {
//     return res.status(401).json({ error: 'Access token required' });
//   }

//   try {
//     // Verify the access token by calling the external API
//     const userInfoResponse = await axios({
//       method: 'get',
//       url: 'https://authtest.cialabs.org/api/user',
//       headers: {
//         'Authorization': `Bearer ${accessToken}`,
//         'Accept': 'application/json',
//       },
//     });

//     const userData = userInfoResponse.data;
//     if (!userData?.id) {
//       return res.status(403).json({ error: 'Invalid access token' });
//     }

//     // Token is valid, proceed with the appropriate method
//     if (req.method === 'POST') {
//       return await createActivity(req, res, userData.id);
//     } else if (req.method === 'GET') {
//       return await getActivities(req, res);
//     } else if (req.method === 'PUT') {
//       return await updateActivity(req, res);
//     } else if (req.method === 'PATCH') {
//       return await partialUpdateActivity(req, res);
//     } else if (req.method === 'DELETE') {
//       return await deleteActivity(req, res);
//     } else {
//       return res.status(405).json({ error: 'Method not allowed' });
//     }
//   } catch (error) {
//     console.error('Error verifying token or handling request:', error);
//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// }

// // POST: Create a new activity
// async function createActivity(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { activityName, metadata, createdWithRole } = req.body;

//   if (!activityName || !userUUID || !createdWithRole) {
//     return res.status(400).json({ error: 'activityName, userUUID, and createdWithRole are required' });
//   }

//   try {
//     // Fetch the user by UUID to get the integer id
//     const user = await prisma.user.findUnique({
//       where: { uuid: userUUID },
//     });

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const newActivity = await prisma.activity.create({
//       data: {
//         activityName,
//         createdById: user.id,
//         createdWithRole,
//         metadata: metadata ?? {},
//       },
//     });

//     return res.status(201).json(newActivity);
//   } catch (error) {
//     console.error('Error creating activity:', error);
//     return res.status(500).json({ error: 'Failed to create activity' });
//   }
// }

// // GET: Fetch all activities or filter by createdById
// async function getActivities(req: NextApiRequest, res: NextApiResponse) {
//   const { createdById } = req.query;

//   try {
//     const activities = await prisma.activity.findMany({
//       where: createdById ? { createdById: Number(createdById) } : {},
//       orderBy: { createdAt: 'desc' },
//     });

//     return res.status(200).json(activities);
//   } catch (error) {
//     console.error('Error fetching activities:', error);
//     return res.status(500).json({ error: 'Failed to fetch activities' });
//   }
// }

// // PUT: Update an activity completely
// async function updateActivity(req: NextApiRequest, res: NextApiResponse) {
//   const { id, activityName, createdWithRole, metadata } = req.body;

//   if (!id) {
//     return res.status(400).json({ error: 'id is required' });
//   }

//   try {
//     const updatedActivity = await prisma.activity.update({
//       where: { id },
//       data: { activityName, createdWithRole, metadata },
//     });

//     return res.status(200).json(updatedActivity);
//   } catch (error) {
//     console.error('Error updating activity:', error);
//     return res.status(500).json({ error: 'Failed to update activity' });
//   }
// }

// // PATCH: Partially update an activity
// async function partialUpdateActivity(req: NextApiRequest, res: NextApiResponse) {
//   const { id, ...updateFields } = req.body;

//   if (!id) {
//     return res.status(400).json({ error: 'id is required' });
//   }

//   try {
//     const updatedActivity = await prisma.activity.update({
//       where: { id },
//       data: { ...updateFields },
//     });

//     return res.status(200).json(updatedActivity);
//   } catch (error) {
//     console.error('Error patching activity:', error);
//     return res.status(500).json({ error: 'Failed to update activity' });
//   }
// }

// // DELETE: Delete an activity
// async function deleteActivity(req: NextApiRequest, res: NextApiResponse) {
//   const { id } = req.query;

//   if (!id) {
//     return res.status(400).json({ error: 'id is required' });
//   }

//   try {
//     const deletedActivity = await prisma.activity.delete({
//       where: { id: Number(id) },
//     });

//     return res.status(200).json({ message: 'Activity deleted successfully', deletedActivity });
//   } catch (error) {
//     console.error('Error deleting activity:', error);
//     return res.status(500).json({ error: 'Failed to delete activity' });
//   }
// }





















































//this is the code which works without the access token
// import { NextApiRequest, NextApiResponse } from 'next';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     try {
//         if (req.method === 'POST') {
//             return await createActivity(req, res);
//         } else if (req.method === 'GET') {
//             return await getActivities(req, res);
//         } else if (req.method === 'PUT') {
//             return await updateActivity(req, res);
//         } else if (req.method === 'PATCH') {
//             return await partialUpdateActivity(req, res);
//         } else {
//             return res.status(405).json({ error: 'Method not allowed' });
//         }
//     } catch (error) {
//         console.error('Error handling activity request:', error);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// }

// //POST: Create a new activity
// async function createActivity(req: NextApiRequest, res: NextApiResponse) {
//     const { isAdministrative, activityName, createdById, metadata } = req.body;

//     if (!activityName || !createdById) {
//         return res.status(400).json({ error: 'activityName and createdById are required' });
//     }

//     try {
//         const newActivity = await prisma.activity.create({
//             data: {
//                 isAdministrative: isAdministrative ?? false,
//                 activityName,
//                 createdById,
//                 metadata: metadata ?? {},
//             },
//         });

//         return res.status(201).json(newActivity);
//     } catch (error) {
//         console.error('Error creating activity:', error);
//         return res.status(500).json({ error: 'Failed to create activity' });
//     }
// }

// //GET: Fetch all activities or filter by createdById
// async function getActivities(req: NextApiRequest, res: NextApiResponse) {
//     const { createdById } = req.query;

//     try {
//         const activities = await prisma.activity.findMany({
//             where: createdById ? { createdById: Number(createdById) } : {},
//             orderBy: { createdAt: 'desc' },
//         });

//         return res.status(200).json(activities);
//     } catch (error) {
//         console.error('Error fetching activities:', error);
//         return res.status(500).json({ error: 'Failed to fetch activities' });
//     }
// }

// // PUT: Update an activity completely
// async function updateActivity(req: NextApiRequest, res: NextApiResponse) {
//     const { activityId, isAdministrative, activityName, createdById, metadata } = req.body;

//     if (!activityId) {
//         return res.status(400).json({ error: 'activityId is required' });
//     }

//     try {
//         const updatedActivity = await prisma.activity.update({
//             where: { activityId },
//             data: { isAdministrative, activityName, createdById, metadata },
//         });

//         return res.status(200).json(updatedActivity);
//     } catch (error) {
//         console.error('Error updating activity:', error);
//         return res.status(500).json({ error: 'Failed to update activity' });
//     }
// }

// // PATCH: Partially update an activity
// async function partialUpdateActivity(req: NextApiRequest, res: NextApiResponse) {
//     const { activityId, ...updateFields } = req.body;

//     if (!activityId) {
//         return res.status(400).json({ error: 'activityId is required' });
//     }

//     try {
//         const updatedActivity = await prisma.activity.update({
//             where: { activityId },
//             data: { ...updateFields },
//         });

//         return res.status(200).json(updatedActivity);
//     } catch (error) {
//         console.error('Error patching activity:', error);
//         return res.status(500).json({ error: 'Failed to update activity' });
//     }
// }

