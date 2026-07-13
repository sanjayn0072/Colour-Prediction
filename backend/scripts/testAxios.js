import axios from 'axios';

const run = async () => {
  try {
    console.log('Sending test request to Pay0 API...');
    const response = await axios.post('https://pay0.shop/api/create-order', {}, {
      timeout: 5000
    });
    console.log('Response:', response.data);
  } catch (err) {
    console.error('Test Failed:', err.message);
  }
};

run();
