//src/app/sessions/page.tsx

'use client';

import { useState, useEffect } from 'react';

// Define the type for a session
interface Session {
  id: number;
  activityId: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  status: string;
}

const SessionsPage = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sessions/session')  // Fetching sessions from API
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching sessions:', error);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1>Sessions</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.id}>
              <strong>Activity ID:</strong> {session.activityId} <br />
              <strong>Status:</strong> {session.status} <br />
              {session.startTime && <strong>Start Time:</strong>} {session.startTime} <br />
              {session.endTime && <strong>End Time:</strong>} {session.endTime} <br />
              {session.duration && <strong>Duration:</strong>} {session.duration} minutes
              <hr />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SessionsPage;
