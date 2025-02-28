// src/pages/api/host/attendence/attendence.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = await clientPromise;
    const db = client.db("AttendanceAppTest");

    // If a batchId query parameter is provided, fetch present students for that batch.
    if (req.query.batchId) {
      // In this example, we assume that the batchId query parameter corresponds to the batch name.
      const batchId = req.query.batchId;
      console.log("Fetching latest attendance for batch:", batchId);

      // Aggregation pipeline (similar to your n8n pipeline)
      const pipeline = [
        // Match the specific batch by name
        { 
          $match: { 
            name: batchId 
          } 
        },
        // Lookup attendance records for the batch
        {
          $lookup: {
            from: "attendances",
            localField: "_id",
            foreignField: "batch",
            as: "attendanceRecords"
          }
        },
        // Unwind the attendances array so each record is separate
        { 
          $unwind: "$attendanceRecords" 
        },
        // Filter for only the "present" attendance records
        { 
          $match: { "attendanceRecords.attendanceStatus": "present" } 
        },
        // Lookup teacher details from the "users" collection
        {
          $lookup: {
            from: "users",
            localField: "attendanceRecords.teacher",
            foreignField: "_id",
            as: "teacherDetails"
          }
        },
        // Lookup student details from the "students" collection
        {
          $lookup: {
            from: "students",
            localField: "attendanceRecords.student",
            foreignField: "_id",
            as: "studentDetails"
          }
        },
        // Project only the fields you need
        {
          $project: {
            batchName: "$name",
            sessionId: "$attendanceRecords.sessionId",
            sessionDate: "$attendanceRecords.date",
            sessionTime: "$attendanceRecords.time",
            instructorName: { $arrayElemAt: ["$teacherDetails.name", 0] },
            instructorEmail: { $arrayElemAt: ["$teacherDetails.email", 0] },
            studentName: { $arrayElemAt: ["$studentDetails.name", 0] },
            studentEmail: { $arrayElemAt: ["$studentDetails.email", 0] },
            attendanceStatus: "$attendanceRecords.attendanceStatus"
          }
        },
        // Sort so that the latest session (by date and time) appears first
        {
          $sort: {
            sessionDate: -1,
            sessionTime: -1,
            studentName: 1
          }
        }
      ];

      // Run the aggregation pipeline on the "batches" collection.
      const aggregationResult = await db.collection("batches").aggregate(pipeline).toArray();

      if (!aggregationResult.length) {
        return res.status(404).json({ message: "No attendance records found for this batch." });
      }

      // Determine the latest session date and time from the first record (which is the latest due to sorting)
      const latestSessionDate = aggregationResult[0].sessionDate;
      const latestSessionTime = aggregationResult[0].sessionTime;

      // Filter all records to include only those from the latest session
      const latestRecords = aggregationResult.filter(record =>
        record.sessionDate === latestSessionDate && record.sessionTime === latestSessionTime
      );

      return res.status(200).json(latestRecords);
    } else {
      // Otherwise, fetch and return all batches.
      console.log("Fetching all batches");
      const batches = await db.collection("batches").find({}).toArray();
      return res.status(200).json({ batches });
    }
  } catch (error) {
    console.error("Attendance API Error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Error fetching data" 
    });
  }
}





































// import type { NextApiRequest, NextApiResponse } from 'next';
// import clientPromise from '@/lib/mongodb';

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   try {
//     const client = await clientPromise;
//     const db = client.db("AttendanceAppTest");

//     // If a batchId query parameter is provided, fetch present students for that batch.
//     if (req.query.batchId) {
//       const batchId = req.query.batchId;
      
//       // 1. Find the latest attendance record for the given batch with attendanceStatus "present"
//       const latestRecord = await db.collection("attendances")
//         .find({ batch: batchId, attendanceStatus: "present" })
//         .sort({ date: -1, time: -1 })
//         .limit(1)
//         .toArray();

//       if (!latestRecord.length) {
//         return res.status(404).json({ message: "No attendance records found for this batch." });
//       }

//       // Use sessionId from the latest record to identify the latest session
//       const latestSessionId = latestRecord[0].sessionId;

//       // 2. Get all attendance records for that batch in the same session
//       const presentRecords = await db.collection("attendances")
//         .find({ batch: batchId, attendanceStatus: "present", sessionId: latestSessionId })
//         .toArray();

//       // 3. Join with the students collection to get more details
//       const studentIds = presentRecords.map(record => record.student);
//       const students = await db.collection("students")
//         .find({ _id: { $in: studentIds } })
//         .toArray();

//       return res.status(200).json({ 
//         sessionId: latestSessionId,
//         date: latestRecord[0].date, 
//         time: latestRecord[0].time,
//         students 
//       });
//     } else {
//       // Otherwise, fetch and return all batches.
//       const batches = await db.collection("batches").find({}).toArray();
//       return res.status(200).json({ batches });
//     }
//   } catch (error) {
//     res.status(500).json({ 
//       error: error instanceof Error ? error.message : "Error fetching data" 
//     });
//   }
// }

































































































// import type { NextApiRequest, NextApiResponse } from 'next';
// import clientPromise from '../../../../app/lib/mongodb';
// import pool from '../../../../app/lib/postgres';


// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   // Handle GET requests
//   if (req.method === 'GET') {
//     const { action, batch } = req.query;

//     // GET batches list: ?action=batches
//     if (action === 'batches') {
//       try {
//         const client = await clientPromise;
//         const db = client.db(process.env.MONGODB_DB);
//         // Get distinct batch values from the "students" collection
//         const batches = await db.collection('students').distinct('batch');
//         return res.status(200).json({ batches });
//       } catch (error) {
//         console.error('Error fetching batches:', error);
//         return res.status(500).json({ error: 'Failed to fetch batches' });
//       }
//     }
    
//     // GET latest attendance for a selected batch: ?action=attendance&batch=XYZ
//     if (action === 'attendance') {
//       if (!batch) {
//         return res.status(400).json({ error: 'Batch parameter is required' });
//       }
//       try {
//         const client = await clientPromise;
//         const db = client.db(process.env.MONGODB_DB);
//         // Find the latest "present" attendance record for this batch
//         const latestRecord = await db
//           .collection('students')
//           .find({ batch, status: 'present' })
//           .sort({ timestamp: -1 })
//           .limit(1)
//           .toArray();
  
//         if (latestRecord.length === 0) {
//           return res.status(404).json({ error: 'No attendance records found for this batch' });
//         }
  
//         // Use the timestamp from the latest record to fetch all records for that date
//         const latestDate = latestRecord[0].timestamp;
//         const attendanceRecords = await db
//           .collection('students')
//           .find({ batch, status: 'present', timestamp: latestDate })
//           .toArray();
  
//         return res.status(200).json({ attendance: attendanceRecords, date: latestDate });
//       } catch (error) {
//         console.error('Error fetching attendance:', error);
//         return res.status(500).json({ error: 'Failed to fetch attendance data' });
//       }
//     }
    
//     return res.status(400).json({ error: 'Invalid action query parameter' });
//   }

//   // Handle POST requests (for adding participants)
//   if (req.method === 'POST') {
//     // For a POST request, we assume the operation is "addParticipants"
//     const { batch, students } = req.body;
//     if (!batch || !students || !Array.isArray(students)) {
//       return res.status(400).json({ error: 'Invalid request body' });
//     }
//     try {
//       const client = await pool.connect();
//       try {
//         await client.query('BEGIN');
//         for (const studentId of students) {
//           // Insert each selected student into the participants table in Postgres.
//           await client.query(
//             'INSERT INTO participants (student_id, batch, created_at) VALUES ($1, $2, NOW())',
//             [studentId, batch]
//           );
//         }
//         await client.query('COMMIT');
//         return res.status(200).json({ message: 'Participants added successfully' });
//       } catch (err) {
//         await client.query('ROLLBACK');
//         throw err;
//       } finally {
//         client.release();
//       }
//     } catch (error) {
//       console.error('Error inserting participants:', error);
//       return res.status(500).json({ error: 'Failed to add participants' });
//     }
//   }
  
//   // If method is not GET or POST, return method not allowed.
//   return res.status(405).json({ error: 'Method not allowed' });
// }
