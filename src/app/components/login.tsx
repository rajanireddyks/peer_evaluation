//src/app/componenets/login.tsx
'use client';
import { useEffect } from 'react';

const CASDOOR_BASE_URL = 'https://authtest.cialabs.org';
const CLIENT_ID = '833931347030f75892db';
const CALLBACK_URL = 'http://localhost:3000/callback'; // Adjust accordingly

export const Login = () => {
  useEffect(() => {
    const authUrl = `${CASDOOR_BASE_URL}/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${CALLBACK_URL}&response_type=code&scope=read&state=randomState`;
    window.location.href = authUrl;
  }, []);

  return (
    <div>
      <h1>Login with Casdoor</h1>
      <p>Redirecting you to Casdoor...</p>
    </div>
  );
};

export default Login;
