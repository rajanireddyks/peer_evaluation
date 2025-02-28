// src/app/page.tsx



'use client';

export default function Login() {
  const handleLogin = () => {
    const authUrl = `${process.env.NEXT_PUBLIC_CASDOOR_BASE_URL}/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_CALLBACK_URL}&response_type=code&scope=read&state=randomState`;
    window.location.href = authUrl;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Message */}
        <p className="text-center text-gray-700 mb-6">Click Login to continue.</p>
        
        {/* Login Button */}
        <button
          type="button"
          onClick={handleLogin}
          className="px-8 py-2 rounded-md bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
        >
          Login
        </button>
      </div>
    </main>
  );
}






































// 'use client';
// import { useEffect } from 'react'; 

// export const Login = () => {
//   useEffect(() => {
//     const authUrl = `${process.env.NEXT_PUBLIC_CASDOOR_BASE_URL}/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_CALLBACK_URL}&response_type=code&scope=read&state=randomState`;
//     window.location.href = authUrl;
//   }, []);

//   return (
//     <div>
//       <h1>Login with Casdoor</h1>
//       <p>Redirecting you to Casdoor...</p>
//     </div>
//   );
// };

// export default Login;






// 'use client';
// import { useState } from 'react';
// //import Image from 'next/image';

// export default function Login() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   const handleGoogleSignIn = () => {
//     const authUrl = `${process.env.NEXT_PUBLIC_CASDOOR_BASE_URL}/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_CALLBACK_URL}&response_type=code&scope=read&state=randomState`;
//     window.location.href = authUrl;
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     // Add your email/password login logic here
//     console.log('Login attempted with:', email, password);
//   };

//   return (
//     <main className="min-h-screen flex flex-col items-center justify-center px-4">
//       <div className="w-full max-w-md space-y-8">
//         {/* Header */}
//         <div className="text-center">
//           <h1 className="text-2xl font-semibold">Login</h1>
//         </div>

//         {/* Login Form */}
//         <form onSubmit={handleSubmit} className="mt-8 space-y-6">
//           {/* Email Field */}
//           <div>
//             <label htmlFor="email" className="block text-sm font-medium text-gray-700">
//               Email
//             </label>
//             <input
//               id="email"
//               type="email"
//               required
//               className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
//               placeholder="Enter your email address"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//             />
//           </div>

//           {/* Password Field */}
//           <div>
//             <div className="flex items-center justify-between">
//               <label htmlFor="password" className="block text-sm font-medium text-gray-700">
//                 Password
//               </label>
//               <a href="#" className="text-sm text-gray-600 hover:text-gray-800">
//                 Forget password?
//               </a>
//             </div>
//             <div className="relative mt-2">
//               <input
//                 id="password"
//                 type="password"
//                 required
//                 className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
//                 placeholder="Enter your Password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//               />
//               <button
//                 type="button"
//                 className="absolute inset-y-0 right-0 flex items-center pr-3"
//               >
//                 <svg
//                   className="h-5 w-5 text-gray-400"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
//                   />
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
//                   />
//                 </svg>
//               </button>
//             </div>
//           </div>

//           {/* Login Button */}
//           <button
//             type="submit"
//             className="w-full rounded-md bg-black py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
//           >
//             Login
//           </button>

//           {/* Divider */}
//           <div className="relative">
//             <div className="absolute inset-0 flex items-center">
//               <div className="w-full border-t border-gray-300"></div>
//             </div>
//             <div className="relative flex justify-center text-sm">
//               <span className="bg-white px-2 text-gray-500">Or</span>
//             </div>
//           </div>

//           {/* Google Sign In Button */}
//           <button
//             type="button"
//             onClick={handleGoogleSignIn}
//             className="w-full rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
//           >
//             <div className="flex items-center justify-center">
//               <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
//                 <path
//                   d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//                   fill="#4285F4"
//                 />
//                 <path
//                   d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//                   fill="#34A853"
//                 />
//                 <path
//                   d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//                   fill="#FBBC05"
//                 />
//                 <path
//                   d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//                   fill="#EA4335"
//                 />
//               </svg>
//               Sign in with Google
//             </div>
//           </button>
//         </form>
//       </div>
//     </main>
//   );
// }



