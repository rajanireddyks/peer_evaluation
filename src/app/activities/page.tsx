//src/app/activities/page.tsx

'use client';

import { useState, useEffect } from 'react';

// Define the type for an activity
interface Activity {
  activityId: number;
  activityName: string;
  isAdministrative: boolean;
}

const ActivitiesPage = () => {
  const [activities, setActivities] = useState<Activity[]>([]); // Specify the type here
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activities/activity')  // Change this line to use '/api/activities/activity'
      .then((res) => res.json())
      .then((data) => {
        setActivities(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching activities:', error);
        setLoading(false);
      });
}, []);


  return (
    <div>
      <h1>Activities</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {activities.map((activity) => (
            <li key={activity.activityId}>
              <strong>{activity.activityName}</strong> (Admin: {activity.isAdministrative ? 'Yes' : 'No'})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivitiesPage;
