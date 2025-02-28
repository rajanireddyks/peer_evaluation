// src/pages/api/host/attendnece/testdb.ts
import { NextApiRequest, NextApiResponse } from 'next';
// Adjust the relative path based on the exact location of your files
import clientPromise from '@/lib/mongodb';

console.log("testdb endpoint hit");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("Attempting to connect to MongoDB...")
    const client = await clientPromise;
    const db = client.db("MONGODB_DB"); // Replace with the actual database name
    console.log("Client connected:", client);
    
    // Try to fetch something simple like the list of collections
    const collections = await db.listCollections().toArray();
        
    res.status(200).json({
      connected: true,
      collections: collections.map((c: { name: string }) => c.name)
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}