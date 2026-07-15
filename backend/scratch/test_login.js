import axios from 'axios';

async function test() {
  const credentials = {
    phoneOrEmail: '20092003pardeep@gmail.com',
    password: 'Kumar870@'
  };

  console.log("Testing credentials on /api/admin/login...");
  try {
    const res = await axios.post('http://localhost:5000/api/admin/login', credentials);
    console.log("Admin login response status:", res.status);
    console.log("Admin login response data:", res.data);
  } catch (err) {
    console.error("Admin login error response:", err.response ? err.response.data : err.message);
  }

  console.log("\nTesting credentials on /api/auth/login...");
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      phoneOrEmail: credentials.phoneOrEmail,
      password: credentials.password
    });
    console.log("Auth login response status:", res.status);
    console.log("Auth login response data:", res.data);
  } catch (err) {
    console.error("Auth login error response:", err.response ? err.response.data : err.message);
  }
}

test();
