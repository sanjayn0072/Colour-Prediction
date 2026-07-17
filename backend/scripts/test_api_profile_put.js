import '../config/env.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const token = jwt.sign({ id: 1, role: 'super_admin' }, process.env.JWT_SECRET);

const run = async () => {
  try {
    console.log('Sending PUT to /api/auth/profile with token...');
    const response = await axios.put('http://localhost:5000/api/auth/profile', {
      name: 'Super Admin Test',
      email: '20092003pardeep@gmail.com'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Response Status:', response.status);
    console.log('Response Data:', response.data);
  } catch (err) {
    if (err.response) {
      console.error('API Error Response:', err.response.status, err.response.data);
    } else {
      console.error('Network Error:', err.message);
    }
  }
};

run();
