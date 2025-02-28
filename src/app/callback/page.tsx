//src/app/callback/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card'; // Import ShadCN Card

type User = {
  UUID: string;
  username: string;
};

const Callback = () => {
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

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
          console.log('API Response:', data);
          if (data.success) {
            setUserDetails(data.user);
            localStorage.setItem('accessToken', data.accessToken);
          } else {
            console.error('Error:', data.error);
          }
        })
        .catch((err) => console.error('Request Failed:', err));
    }
  }, [searchParams]);

  const handleRoleSelection = (role: 'HOST' | 'PARTICIPANT') => {
    localStorage.setItem('selectedRole', role);
    if (role === 'HOST') {
      router.push('/host/hostpage');
    } else {
      router.push('/participantpage');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {userDetails ? (
        <>
          {/* Welcome Message */}
          <h1 className="text-4xl font-bold text-center mb-10">
            Welcome, {userDetails.username}!
          </h1>

          {/* Role Selection */}
          <h2 className="text-2xl font-semibold text-center mb-6">Choose Your Role</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {/* Host Card */}
            <Card
              className="cursor-pointer w-40 sm:w-48 hover:bg-gray-200 transition"
              onClick={() => handleRoleSelection('HOST')}
            >
              <CardContent className="flex flex-col items-center p-6">
                <Image src="/host.svg" alt="Host" width={66} height={66} priority />
                <p className="mt-2 text-lg font-medium text-indigo-600">Host</p>
              </CardContent>
            </Card>

            {/* Participant Card */}
            <Card
              className="cursor-pointer w-40 sm:w-48 hover:bg-gray-200 transition"
              onClick={() => handleRoleSelection('PARTICIPANT')}
            >
              <CardContent className="flex flex-col items-center p-6">
                <Image src="/participant.svg" alt="Participant" width={66} height={66} priority />
                <p className="mt-2 text-lg font-medium text-indigo-600">Participant</p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <p className="text-lg text-gray-600">Loading user information...</p>
      )}
    </div>
  );
};

export default Callback;








































//important
// 'use client';
// import { useEffect, useState } from 'react';
// import { useSearchParams, useRouter } from 'next/navigation';

// type User = {
//   UUID: string;
//   username: string;
//   email: string;
// };

// const Callback = () => {
//   const [userDetails, setUserDetails] = useState<User | null>(null);
//   const searchParams = useSearchParams();
//   const router = useRouter();

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
//           console.log('API Response:', data);
//           if (data.success) {
//             setUserDetails(data.user);
//             localStorage.setItem('accessToken', data.accessToken);
//           } else {
//             console.error('Error:', data.error);
//           }
//         })
//         .catch((err) => console.error('Request Failed:', err));
//     }
//   }, [searchParams]);

//   const handleRoleSelection = (role: 'HOST' | 'PARTICIPANT') => {
//     localStorage.setItem('selectedRole', role);
//     if (role === 'HOST') {
//       router.push('/host-dashboard'); // Redirect to host workflow
//     } else {
//       router.push('/participant-dashboard'); // Redirect to participant workflow
//     }
//   };

//   return (
//     <div>
//       {userDetails ? (
//         <div>
//           <h1>Welcome, {userDetails.username}</h1>
//           <p>Email: {userDetails.email}</p>
//           <h2>Select Your Role:</h2>
//           <button onClick={() => handleRoleSelection('HOST')}>HOST</button>
//           <button onClick={() => handleRoleSelection('PARTICIPANT')}>PARTICIPANT</button>
//         </div>
//       ) : (
//         <p>Loading user information...</p>
//       )}
//     </div>
//   );
// };

// export default Callback;





















// 'use client';
// import { useEffect, useState } from 'react';
// import { useSearchParams } from 'next/navigation';

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
//             localStorage.setItem('accessToken', data.accessToken); // Store token locally
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
