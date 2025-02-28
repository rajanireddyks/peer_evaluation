//src/pages/api/createactivity.ts

import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();
const casdoorBaseUrl = process.env.NEXT_PUBLIC_CASDOOR_BASE_URL;
if (!casdoorBaseUrl) {
  throw new Error("NEXT_PUBLIC_CASDOOR_BASE_URL is not defined in .env");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const accessToken = req.headers.authorization?.split(" ")[1];
  if (!accessToken) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const userInfoResponse = await axios.get(`${casdoorBaseUrl}/api/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = userInfoResponse.data;

    if (!userData?.id) {
      return res.status(403).json({ error: "Invalid access token" });
    }

    if (req.method === "POST") {
      return await createActivity(req, res, userData.id);
    } else if (req.method === "GET") {
      return await getActivities(req, res);
    } else if (req.method === "PATCH") {
      return await updateActivity(req, res, userData.id);
    } else if (req.method === "PUT") {
      return await updateRubric(req, res, userData.id);
    } else if (req.method === "DELETE") {
      return await deleteActivity(req, res, userData.id);
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: unknown) {
    console.error("Error verifying token or handling request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/* -------------------- CREATE (POST) -------------------- */
async function createActivity(
  req: NextApiRequest,
  res: NextApiResponse,
  userUUID: string
) {
  const { activityName, createdWithRole, metadata = {}, rubricCriteria, maxMarks } = req.body;

  if (!activityName || !createdWithRole) {
    return res
      .status(400)
      .json({ error: "activityName and createdWithRole are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // NOTE: We have removed the duplicate check so that a user can create a new activity
    // even if they have created one before.

    // Create Activity record
    const newActivity = await prisma.activity.create({
      data: {
        activityName,
        createdById: user.id,
        createdWithRole,
        metadata,
      },
    });

    // Create ActivityItem record
    await prisma.activityItem.create({
      data: {
        activityId: newActivity.id,
        metadata: {
          createdById: user.id,
          createdWithRole,
          activityName,
          ...metadata,
        },
      },
    });

    // Create Rubric record if rubric data is provided
    if (Array.isArray(rubricCriteria) && rubricCriteria.length > 0 && maxMarks) {
      await prisma.rubric.create({
        data: {
          activityId: newActivity.id,
          criteria: rubricCriteria,
          maxMarks: maxMarks,
        },
      });
    }

    return res.status(201).json(newActivity);
  } catch (error: unknown) {
    console.error("Error creating activity:", error);
    return res.status(500).json({ error: "Failed to create activity" });
  }
}

/* -------------------- READ (GET) -------------------- */
async function getActivities(req: NextApiRequest, res: NextApiResponse) {
  const { activityId } = req.query;

  if (activityId) {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: Number(activityId) },
        include: { rubrics: true, activityItems: true },
      });
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      return res.status(200).json(activity);
    } catch (error: unknown) {
      console.error("Error fetching activity:", error);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }
  } else {
    try {
      const activities = await prisma.activity.findMany({
        include: { rubrics: true, activityItems: true },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(activities);
    } catch (error: unknown) {
      console.error("Error fetching activities:", error);
      return res.status(500).json({ error: "Failed to fetch activities" });
    }
  }
}

/* -------------------- UPDATE (PATCH) -------------------- */
async function updateActivity(
  req: NextApiRequest,
  res: NextApiResponse,
  userUUID: string
) {
  const { id, activityName, metadata } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Activity ID is required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingActivity = await prisma.activity.findUnique({
      where: { id },
      include: { activityItems: true },
    });
    if (!existingActivity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    if (existingActivity.createdById !== user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this activity." });
    }

    const existingMetadata = (existingActivity.metadata as Prisma.JsonObject) || {};
    const updatedMetadata = { ...existingMetadata, ...metadata };

    await prisma.activity.update({
      where: { id },
      data: {
        activityName: activityName ?? existingActivity.activityName,
        metadata: updatedMetadata,
      },
    });

    // Update activityItem metadata if it exists
    const existingItem = existingActivity.activityItems[0];
    if (existingItem) {
      const existingItemMetadata = (existingItem.metadata as Prisma.JsonObject) || {};
      const updatedItemMetadata = {
        createdById:
          existingItemMetadata.createdById || existingMetadata.createdById || null,
        createdWithRole:
          existingItemMetadata.createdWithRole ||
          existingMetadata.createdWithRole ||
          null,
        activityName:
          activityName ??
          existingItemMetadata.activityName ??
          existingMetadata.activityName,
      };
      await prisma.activityItem.update({
        where: { id: existingItem.id },
        data: { metadata: updatedItemMetadata },
      });
    }

    return res.status(200).json({ message: "Activity updated successfully" });
  } catch (error: unknown) {
    console.error("Error updating activity:", error);
    return res.status(500).json({ error: "Failed to update activity" });
  }
}

/* -------------------- UPDATE RUBRIC (PUT) -------------------- */
async function updateRubric(
  req: NextApiRequest,
  res: NextApiResponse,
  userUUID: string
) {
  const { id, rubricCriteria, maxMarks } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Activity ID is required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingActivity = await prisma.activity.findUnique({ where: { id } });
    if (!existingActivity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    if (existingActivity.createdById !== user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this rubric." });
    }

    const existingRubric = await prisma.rubric.findFirst({
      where: { activityId: id },
    });
    if (!existingRubric) {
      return res.status(404).json({ error: "Rubric not found" });
    }

    await prisma.rubric.update({
      where: { id: existingRubric.id },
      data: {
        criteria: rubricCriteria ?? existingRubric.criteria,
        maxMarks: maxMarks ?? existingRubric.maxMarks,
      },
    });

    return res.status(200).json({ message: "Rubric updated successfully" });
  } catch (error: unknown) {
    console.error("Error updating rubric:", error);
    return res.status(500).json({ error: "Failed to update rubric" });
  }
}

/* -------------------- DELETE -------------------- */
async function deleteActivity(
  req: NextApiRequest,
  res: NextApiResponse,
  userUUID: string
) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Activity ID is required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingActivity = await prisma.activity.findUnique({
      where: { id: Number(id) },
    });
    if (!existingActivity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    if (existingActivity.createdById !== user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this activity." });
    }

    // Delete Rubric and ActivityItem before Activity
    await prisma.rubric.deleteMany({ where: { activityId: Number(id) } });
    await prisma.activityItem.deleteMany({ where: { activityId: Number(id) } });

    await prisma.activity.delete({ where: { id: Number(id) } });
    return res.status(200).json({ message: "Activity deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting activity:", error);
    return res.status(500).json({ error: "Failed to delete activity" });
  }
}





































//other imp
// import { NextApiRequest, NextApiResponse } from "next";
// import { PrismaClient, Prisma } from "@prisma/client";
// import axios from "axios";

// const prisma = new PrismaClient();
// const casdoorBaseUrl = process.env.NEXT_PUBLIC_CASDOOR_BASE_URL;
// if (!casdoorBaseUrl) {
//   throw new Error("NEXT_PUBLIC_CASDOOR_BASE_URL is not defined in .env");
// }

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const accessToken = req.headers.authorization?.split(" ")[1];
//   if (!accessToken) {
//     return res.status(401).json({ error: "Access token required" });
//   }
//   try {
//     const userInfoResponse = await axios.get(`${casdoorBaseUrl}/api/user`, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });
//     const userData = userInfoResponse.data;
//     if (!userData?.id) {
//       return res.status(403).json({ error: "Invalid access token" });
//     }
//     if (req.method === "POST") {
//       return await createActivity(req, res, userData.id);
//     } else if (req.method === "GET") {
//       return await getActivities(req, res);
//     } else if (req.method === "PATCH") {
//       return await updateActivity(req, res, userData.id);
//     } else if (req.method === "PUT") {
//       return await updateRubric(req, res, userData.id);
//     } else if (req.method === "DELETE") {
//       return await deleteActivity(req, res, userData.id);
//     } else {
//       return res.status(405).json({ error: "Method not allowed" });
//     }
//   } catch (error: unknown) {
//     console.error("Error verifying token or handling request:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// }

// /* -------------------- CREATE (POST) -------------------- */
// async function createActivity(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { activityName, createdWithRole, metadata = {}, rubricCriteria, maxMarks } = req.body;
//   if (!activityName || !createdWithRole) {
//     return res.status(400).json({ error: "activityName and createdWithRole are required" });
//   }
//   try {
//     const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     // Create Activity record
//     const newActivity = await prisma.activity.create({
//       data: {
//         activityName,
//         createdById: user.id,
//         createdWithRole,
//         metadata,
//       },
//     });
//     // Create ActivityItem record
//     await prisma.activityItem.create({
//       data: {
//         activityId: newActivity.id,
//         metadata: {
//           createdById: user.id,
//           createdWithRole,
//           activityName,
//           ...metadata,
//         },
//       },
//     });
//     // Create Rubric record if rubric data is provided
//     if (Array.isArray(rubricCriteria) && rubricCriteria.length > 0 && maxMarks) {
//       await prisma.rubric.create({
//         data: {
//           activityId: newActivity.id,
//           criteria: rubricCriteria,
//           maxMarks: maxMarks,
//         },
//       });
//     }
//     return res.status(201).json(newActivity);
//   } catch (error: unknown) {
//     console.error("Error creating activity:", error);
//     return res.status(500).json({ error: "Failed to create activity" });
//   }
// }

// /* -------------------- READ (GET) -------------------- */
// async function getActivities(req: NextApiRequest, res: NextApiResponse) {
//   const { activityId } = req.query;
//   if (activityId) {
//     try {
//       const activity = await prisma.activity.findUnique({
//         where: { id: Number(activityId) },
//         include: { rubrics: true, activityItems: true },
//       });
//       if (!activity) return res.status(404).json({ error: "Activity not found" });
//       return res.status(200).json(activity);
//     } catch (error: unknown) {
//       console.error("Error fetching activity:", error);
//       return res.status(500).json({ error: "Failed to fetch activity" });
//     }
//   } else {
//     try {
//       const activities = await prisma.activity.findMany({
//         include: { rubrics: true, activityItems: true },
//         orderBy: { createdAt: "desc" },
//       });
//       return res.status(200).json(activities);
//     } catch (error: unknown) {
//       console.error("Error fetching activities:", error);
//       return res.status(500).json({ error: "Failed to fetch activities" });
//     }
//   }
// }

// /* -------------------- UPDATE (PATCH) -------------------- */
// async function updateActivity(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { id, activityName, metadata } = req.body;
//   if (!id) {
//     return res.status(400).json({ error: "Activity ID is required" });
//   }
//   try {
//     const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     const existingActivity = await prisma.activity.findUnique({
//       where: { id },
//       include: { activityItems: true },
//     });
//     if (!existingActivity) {
//       return res.status(404).json({ error: "Activity not found" });
//     }
//     if (existingActivity.createdById !== user.id) {
//       return res.status(403).json({ error: "You are not authorized to update this activity." });
//     }
//     const existingMetadata = (existingActivity.metadata as Prisma.JsonObject) || {};
//     const updatedMetadata = { ...existingMetadata, ...metadata };
//     await prisma.activity.update({
//       where: { id },
//       data: {
//         activityName: activityName ?? existingActivity.activityName,
//         metadata: updatedMetadata,
//       },
//     });
//     const existingItem = existingActivity.activityItems[0];
//     if (existingItem) {
//       const existingItemMetadata = (existingItem.metadata as Prisma.JsonObject) || {};
//       const updatedItemMetadata = {
//         createdById: existingItemMetadata.createdById || existingMetadata.createdById || null,
//         createdWithRole: existingItemMetadata.createdWithRole || existingMetadata.createdWithRole || null,
//         activityName: activityName ?? existingItemMetadata.activityName ?? existingMetadata.activityName,
//       };
//       await prisma.activityItem.update({
//         where: { id: existingItem.id },
//         data: { metadata: updatedItemMetadata },
//       });
//     }
//     return res.status(200).json({ message: "Activity updated successfully" });
//   } catch (error: unknown) {
//     console.error("Error updating activity:", error);
//     return res.status(500).json({ error: "Failed to update activity" });
//   }
// }

// /* -------------------- UPDATE RUBRIC (PUT) -------------------- */
// async function updateRubric(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { id, rubricCriteria, maxMarks } = req.body;
//   if (!id) {
//     return res.status(400).json({ error: "Activity ID is required" });
//   }
//   try {
//     const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     const existingActivity = await prisma.activity.findUnique({ where: { id } });
//     if (!existingActivity) {
//       return res.status(404).json({ error: "Activity not found" });
//     }
//     if (existingActivity.createdById !== user.id) {
//       return res.status(403).json({ error: "You are not authorized to update this rubric." });
//     }
//     const existingRubric = await prisma.rubric.findFirst({ where: { activityId: id } });
//     if (!existingRubric) {
//       return res.status(404).json({ error: "Rubric not found" });
//     }
//     await prisma.rubric.update({
//       where: { id: existingRubric.id },
//       data: {
//         criteria: rubricCriteria ?? existingRubric.criteria,
//         maxMarks: maxMarks ?? existingRubric.maxMarks,
//       },
//     });
//     return res.status(200).json({ message: "Rubric updated successfully" });
//   } catch (error: unknown) {
//     console.error("Error updating rubric:", error);
//     return res.status(500).json({ error: "Failed to update rubric" });
//   }
// }

// /* -------------------- DELETE -------------------- */
// async function deleteActivity(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { id } = req.query;
//   if (!id) {
//     return res.status(400).json({ error: "Activity ID is required" });
//   }
//   try {
//     const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     const existingActivity = await prisma.activity.findUnique({
//       where: { id: Number(id) },
//     });
//     if (!existingActivity) {
//       return res.status(404).json({ error: "Activity not found" });
//     }
//     if (existingActivity.createdById !== user.id) {
//       return res.status(403).json({ error: "You are not authorized to delete this activity." });
//     }
//     await prisma.rubric.deleteMany({ where: { activityId: Number(id) } });
//     await prisma.activityItem.deleteMany({ where: { activityId: Number(id) } });
//     await prisma.activity.delete({ where: { id: Number(id) } });
//     return res.status(200).json({ message: "Activity deleted successfully" });
//   } catch (error: unknown) {
//     console.error("Error deleting activity:", error);
//     return res.status(500).json({ error: "Failed to delete activity" });
//   }
// }

























// //imp
// import { NextApiRequest, NextApiResponse } from "next";
// import { PrismaClient, Prisma } from "@prisma/client";
// import axios from "axios";

// const prisma = new PrismaClient();
// const casdoorBaseUrl = process.env.NEXT_PUBLIC_CASDOOR_BASE_URL;
// if (!casdoorBaseUrl) {
//   throw new Error("NEXT_PUBLIC_CASDOOR_BASE_URL is not defined in .env");
// }

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const accessToken = req.headers.authorization?.split(" ")[1];
//   if (!accessToken) {
//     return res.status(401).json({ error: "Access token required" });
//   }

//   try {
//     const userInfoResponse = await axios.get(`${casdoorBaseUrl}/api/user`, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });
//     const userData = userInfoResponse.data;
//     if (!userData?.id) {
//       return res.status(403).json({ error: "Invalid access token" });
//     }

//     if (req.method === "POST") {
//       return await createActivity(req, res, userData.id);
//     } else if (req.method === "GET") {
//       return await getActivities(req, res);
//     } else if (req.method === "PATCH") {
//       return await updateActivity(req, res, userData.id);
//     } else if (req.method === "PUT") {
//       return await updateRubric(req, res, userData.id);
//     } else if (req.method === "DELETE") {
//       return await deleteActivity(req, res, userData.id);
//     } else {
//       return res.status(405).json({ error: "Method not allowed" });
//     }
//   } catch (error) {
//     console.error("Error verifying token or handling request:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// }

// /* -------------------- CREATE (POST) -------------------- */
// async function createActivity(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { activityName, createdWithRole, metadata = {}, rubricCriteria, maxMarks } = req.body;
//   if (!activityName || !createdWithRole) {
//     return res.status(400).json({ error: "activityName and createdWithRole are required" });
//   }

//   try {
//     const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // No role check here since we don't store role in the backend.
//     // The frontend sends createdWithRole, which is stored with the activity.

//     const newActivity = await prisma.activity.create({
//       data: {
//         activityName,
//         createdById: user.id,
//         createdWithRole, // This value comes from the frontend
//         metadata,
//       },
//     });

//     await prisma.activityItem.create({
//       data: {
//         activityId: newActivity.id,
//         metadata: {
//           createdById: user.id,
//           createdWithRole,
//           activityName,
//           ...metadata,
//         },
//       },
//     });

//     // Create a Rubric record if rubric data is provided.
//     if (Array.isArray(rubricCriteria) && rubricCriteria.length > 0 && maxMarks) {
//       await prisma.rubric.create({
//         data: {
//           activityId: newActivity.id,
//           criteria: rubricCriteria, // Array of objects (each with name and rating)
//           maxMarks: maxMarks,       // Mapping object: e.g., { "Clarity": 10, ... }
//         },
//       });
//     }

//     return res.status(201).json(newActivity);
//   } catch (error) {
//     console.error("Error creating activity:", error);
//     return res.status(500).json({ error: "Failed to create activity" });
//   }
// }

// /* -------------------- READ (GET) -------------------- */
// async function getActivities(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     const activities = await prisma.activity.findMany({
//       include: { rubrics: true, activityItems: true },
//       orderBy: { createdAt: "desc" },
//     });
//     return res.status(200).json(activities);
//   } catch (error) {
//     console.error("Error fetching activities:", error);
//     return res.status(500).json({ error: "Failed to fetch activities" });
//   }
// }

// /* -------------------- UPDATE (PATCH) -------------------- */
// async function updateActivity(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { id, activityName, metadata } = req.body;
//   if (!id) {
//     return res.status(400).json({ error: "Activity ID is required" });
//   }

//   try {
//     const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const existingActivity = await prisma.activity.findUnique({
//       where: { id },
//       include: { activityItems: true },
//     });
//     if (!existingActivity) {
//       return res.status(404).json({ error: "Activity not found" });
//     }

//     // Only allow the owner (based on createdById) to update.
//     if (existingActivity.createdById !== user.id) {
//       return res.status(403).json({ error: "You are not authorized to update this activity." });
//     }

//     const existingMetadata = (existingActivity.metadata as Prisma.JsonObject) || {};
//     const updatedMetadata = { ...existingMetadata, ...metadata };

//     await prisma.activity.update({
//       where: { id },
//       data: {
//         activityName: activityName ?? existingActivity.activityName,
//         metadata: updatedMetadata,
//       },
//     });

//     const existingItem = existingActivity.activityItems[0];
//     if (existingItem) {
//       const existingItemMetadata = (existingItem.metadata as Prisma.JsonObject) || {};
//       const updatedItemMetadata = {
//         createdById: existingItemMetadata.createdById || existingMetadata.createdById || null,
//         createdWithRole: existingItemMetadata.createdWithRole || existingMetadata.createdWithRole || null,
//         activityName: activityName ?? existingItemMetadata.activityName ?? existingMetadata.activityName,
//       };

//       await prisma.activityItem.update({
//         where: { id: existingItem.id },
//         data: { metadata: updatedItemMetadata },
//       });
//     }

//     return res.status(200).json({ message: "Activity updated successfully" });
//   } catch (error) {
//     console.error("Error updating activity:", error);
//     return res.status(500).json({ error: "Failed to update activity" });
//   }
// }

// /* -------------------- UPDATE RUBRIC (PUT) -------------------- */
// async function updateRubric(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { id, rubricCriteria, maxMarks } = req.body;
//   if (!id) {
//     return res.status(400).json({ error: "Activity ID is required" });
//   }

//   try {
//     const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const existingActivity = await prisma.activity.findUnique({ where: { id } });
//     if (!existingActivity) {
//       return res.status(404).json({ error: "Activity not found" });
//     }

//     // Only allow the owner to update the rubric.
//     if (existingActivity.createdById !== user.id) {
//       return res.status(403).json({ error: "You are not authorized to update this rubric." });
//     }

//     const existingRubric = await prisma.rubric.findFirst({ where: { activityId: id } });
//     if (!existingRubric) {
//       return res.status(404).json({ error: "Rubric not found" });
//     }

//     await prisma.rubric.update({
//       where: { id: existingRubric.id },
//       data: {
//         criteria: rubricCriteria ?? existingRubric.criteria,
//         maxMarks: maxMarks ?? existingRubric.maxMarks,
//       },
//     });

//     return res.status(200).json({ message: "Rubric updated successfully" });
//   } catch (error) {
//     console.error("Error updating rubric:", error);
//     return res.status(500).json({ error: "Failed to update rubric" });
//   }
// }

// /* -------------------- DELETE -------------------- */
// async function deleteActivity(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//   const { id } = req.query;
//   if (!id) {
//     return res.status(400).json({ error: "Activity ID is required" });
//   }
//   try {
//     const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const existingActivity = await prisma.activity.findUnique({
//       where: { id: Number(id) },
//     });
//     if (!existingActivity) {
//       return res.status(404).json({ error: "Activity not found" });
//     }

//     if (existingActivity.createdById !== user.id) {
//       return res.status(403).json({ error: "You are not authorized to delete this activity." });
//     }

//     await prisma.rubric.deleteMany({ where: { activityId: Number(id) } });
//     await prisma.activityItem.deleteMany({ where: { activityId: Number(id) } });
//     await prisma.activity.delete({ where: { id: Number(id) } });

//     return res.status(200).json({ message: "Activity deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting activity:", error);
//     return res.status(500).json({ error: "Failed to delete activity" });
//   }
// }










































// import { NextApiRequest, NextApiResponse } from 'next';
// import { PrismaClient, Prisma } from '@prisma/client';
// import axios from 'axios';

// const prisma = new PrismaClient();
// const casdoorBaseUrl = process.env.NEXT_PUBLIC_CASDOOR_BASE_URL;
// if (!casdoorBaseUrl) {
//     throw new Error("NEXT_PUBLIC_CASDOOR_BASE_URL is not defined in .env");
// }

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     console.log("Incoming request body:", req.body);
//     const accessToken = req.headers.authorization?.split(' ')[1];
//     if (!accessToken) {
//         return res.status(401).json({ error: 'Access token required' });
//     }

//     try {
//         const userInfoResponse = await axios.get(`${casdoorBaseUrl}/api/user`, {  
//             headers: { 'Authorization': `Bearer ${accessToken}` },  
//         });

//         const userData = userInfoResponse.data;
//         if (!userData?.id) {
//             return res.status(403).json({ error: 'Invalid access token' });
//         }

//         if (req.method === 'POST') {
//             return await createActivity(req, res, userData.id);
//         } else if (req.method === 'GET') {
//             return await getActivities(req, res);
//         } else if (req.method === 'PATCH') {
//             return await updateActivity(req, res);
//         } else if (req.method === 'PUT') {
//             return await updateRubric(req, res);
//         } else if (req.method === 'DELETE') {
//             return await deleteActivity(req, res);
//         } else {
//             return res.status(405).json({ error: 'Method not allowed' });
//         }
//     } catch (error) {
//         console.error('Error verifying token or handling request:', error);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// }

// async function createActivity(req: NextApiRequest, res: NextApiResponse, userUUID: string) {
//     const { activityName, createdWithRole, metadata = {}, rubricCriteria, maxMarks } = req.body; // Ensure metadata defaults to an empty object
//     console.log("Incoming request body:", req.body);
//     if (!activityName || !createdWithRole) {
//         return res.status(400).json({ error: 'activityName and createdWithRole are required' });
//     }

//     try {
//         const user = await prisma.user.findUnique({ where: { uuid: userUUID } });
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         const newActivity = await prisma.activity.create({
//             data: {
//                 activityName,
//                 createdById: user.id,
//                 createdWithRole,
//                 metadata, // Ensure metadata is stored properly
//             },
//         });

//         await prisma.activityItem.create({
//             data: {
//                 activityId: newActivity.id,
//                 metadata: {
//                     createdById: user.id,
//                     createdWithRole,
//                     activityName,
//                     ...metadata, // Ensures metadata is included if provided
//                 },
//             },
//         });

//         if (rubricCriteria && maxMarks) {
//             await prisma.rubric.create({
//                 data: {
//                     activityId: newActivity.id,
//                     criteria: rubricCriteria,
//                     maxMarks: maxMarks,
//                 },
//             });
//         }

//         return res.status(201).json(newActivity);
//     } catch (error) {
//         console.error('Error creating activity:', error);
//         return res.status(500).json({ error: 'Failed to create activity' });
//     }
// }

// async function getActivities(req: NextApiRequest, res: NextApiResponse) {
//     try {
//         const activities = await prisma.activity.findMany({
//             include: { rubrics: true, activityItems: true },
//             orderBy: { createdAt: 'desc' },
//         });
//         return res.status(200).json(activities);
//     } catch (error) {
//         console.error('Error fetching activities:', error);
//         return res.status(500).json({ error: 'Failed to fetch activities' });
//     }
// }

// async function updateActivity(req: NextApiRequest, res: NextApiResponse) {
//     const { id, activityName, metadata } = req.body;

//     if (!id) {
//         return res.status(400).json({ error: 'Activity ID is required' });
//     }

//     try {
//         const existingActivity = await prisma.activity.findUnique({
//             where: { id },
//             include: { activityItems: true } // Fetch related activityItems
//         });

//         if (!existingActivity) {
//             return res.status(404).json({ error: 'Activity not found' });
//         }

//         // Ensure existing metadata is an object
//         const existingMetadata = (existingActivity.metadata as Prisma.JsonObject) ?? {};

//         // Merge metadata properly while keeping existing values
//         const updatedMetadata = { ...existingMetadata, ...metadata };

//         await prisma.activity.update({
//             where: { id },
//             data: { 
//                 activityName: activityName ?? existingActivity.activityName, // Only update if provided
//                 metadata: updatedMetadata, 
//             },
//         });

//         // Fetch the first activity item related to the activity
//         const existingActivityItem = existingActivity.activityItems[0];

//         if (existingActivityItem) {
//             const existingItemMetadata = (existingActivityItem.metadata as Prisma.JsonObject) ?? {};

//             // Preserve createdById and createdWithRole while updating activityName
//             const updatedItemMetadata: Prisma.JsonObject = {
//                 createdById: existingItemMetadata?.createdById ?? existingMetadata?.createdById ?? null, // Keep unchanged
//                 createdWithRole: existingItemMetadata?.createdWithRole ?? existingMetadata?.createdWithRole ?? null, // Keep unchanged
//                 activityName: activityName ?? existingItemMetadata?.activityName ?? existingMetadata?.activityName, // Update name only
//             };

//             await prisma.activityItem.update({
//                 where: { id: existingActivityItem.id },
//                 data: { metadata: updatedItemMetadata },
//             });
//         }

//         return res.status(200).json({ message: 'Activity updated successfully' });
//     } catch (error) {
//         console.error('Error updating activity:', error);
//         return res.status(500).json({ error: 'Failed to update activity' });
//     }
// }

// async function updateRubric(req: NextApiRequest, res: NextApiResponse) {
//     const { id, rubricCriteria, maxMarks } = req.body;

//     if (!id) {
//         return res.status(400).json({ error: 'Activity ID is required' });
//     }

//     try {
//         const existingRubric = await prisma.rubric.findFirst({ where: { activityId: id } });

//         if (!existingRubric) {
//             return res.status(404).json({ error: 'Rubric not found' });
//         }

//         // Ensure existing maxMarks is an object, otherwise default to an empty object
//         const existingMaxMarks = (existingRubric.maxMarks as Prisma.JsonObject) ?? {};

//         // Ensure updated criteria includes either new or existing criteria
//         const updatedCriteria = rubricCriteria ?? existingRubric.criteria;

//         // Filter maxMarks: Keep only keys that exist in rubricCriteria
//         const filteredMaxMarks: Prisma.JsonObject = {};
//         updatedCriteria.forEach((criterion: string) => {
//             if (maxMarks && Object.prototype.hasOwnProperty.call(maxMarks, criterion)) {
//                 filteredMaxMarks[criterion] = maxMarks[criterion]; // Keep only updated values
//             } else if (Object.prototype.hasOwnProperty.call(existingMaxMarks, criterion)) {
//                 filteredMaxMarks[criterion] = existingMaxMarks[criterion]; // Preserve old values
//             }
//         });

//         await prisma.rubric.updateMany({
//             where: { activityId: id },
//             data: { 
//                 criteria: updatedCriteria, // Only update if rubricCriteria is provided
//                 maxMarks: filteredMaxMarks // Ensure only relevant fields are updated
//             },
//         });

//         return res.status(200).json({ message: 'Rubric updated successfully' });
//     } catch (error) {
//         console.error('Error updating rubric:', error);
//         return res.status(500).json({ error: 'Failed to update rubric' });
//     }
// }

// async function deleteActivity(req: NextApiRequest, res: NextApiResponse) {
//     const { id } = req.query;
//     if (!id) {
//         return res.status(400).json({ error: 'Activity ID is required' });
//     }
//     try {
//         await prisma.rubric.deleteMany({ where: { activityId: Number(id) } });
//         await prisma.activityItem.deleteMany({ where: { activityId: Number(id) } });
//         await prisma.activity.delete({ where: { id: Number(id) } });
//         return res.status(200).json({ message: 'Activity deleted successfully' });
//     } catch (error) {
//         console.error('Error deleting activity:', error);
//         return res.status(500).json({ error: 'Failed to delete activity' });
//     }
// }










