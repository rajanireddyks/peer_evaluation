//src/app/rubrics/page.tsx

'use client';

import { useState, useEffect } from 'react';

interface Rubric {
  rubricId: number;
  activityId: number;
  criteria: Record<string, string>; // Dynamic criteria keys
  criteriaMarks: Record<string, number>; // Marks mapped to each criterion
  createdAt: string;
  updatedAt: string;
}

const RubricsPage = () => {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rubrics')
      .then((res) => res.json())
      .then((data: Rubric[]) => {
        setRubrics(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching rubrics:', error);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1>Rubrics</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {rubrics.map((rubric) => (
            <li key={rubric.rubricId}>
              <strong>Activity ID: {rubric.activityId}</strong>
              <p><strong>Criteria:</strong></p>
              <ul>
                {Object.entries(rubric.criteria).map(([key, value]) => (
                  <li key={key}><strong>{key}</strong>: {value}</li>
                ))}
              </ul>
              <p><strong>Criteria Marks:</strong></p>
              <ul>
                {Object.entries(rubric.criteriaMarks).map(([key, value]) => (
                  <li key={key}><strong>{rubric.criteria[key]}</strong>: {value}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RubricsPage;
