//src/app/callback/page.tsx

'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type User = {
  UUID: string;
  username: string;
  email: string;
};

const Callback = () => {
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams?.get('code');
    if (code) {
      fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUserDetails(data.user);
            localStorage.setItem('accessToken', data.accessToken); // Store token locally
          } else {
            console.error('Error:', data.error);
          }
        })
        .catch((err) => console.error('Request Failed:', err));
    }
  }, [searchParams]);

  return (
    <div>
      {userDetails ? (
        <div>
          <h1>Welcome, {userDetails.username}</h1>
          <p>Email: {userDetails.email}</p>
        </div>
      ) : (
        <p>Loading user information...</p>
      )}
    </div>
  );
};

export default Callback;















// 'use client';
// import { useEffect, useState } from 'react';
// import { useSearchParams } from 'next/navigation';

// // Define User type
// type User = {
//   UUID: string;
//   username: string;
//   email: string;
// };

// const Callback = () => {
//   const [userDetails, setUserDetails] = useState<User | null>(null);
//   const searchParams = useSearchParams();

//   useEffect(() => {
//     const code = searchParams?.get('code');
//     if (code) {
//       fetch('/api/auth/callback', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ code }),
//       })
//         .then((res) => res.json())
//         .then((data) => {
//           if (data.success) {
//             setUserDetails(data.user);
//           } else {
//             console.error('Error:', data.error);
//           }
//         })
//         .catch((err) => console.error('Request Failed:', err));
//     }
//   }, [searchParams]);

//   return (
//     <div>
//       {userDetails ? (
//         <div>
//           <h1>Welcome, {userDetails.username}</h1>
//           <p>Email: {userDetails.email}</p>
//         </div>
//       ) : (
//         <p>Loading user information...</p>
//       )}
//     </div>
//   );
// };

// export default Callback;
