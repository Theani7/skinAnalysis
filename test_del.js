const axios = require('axios');
async function test() {
  try {
    // We need to login first to get a token.
    const loginResp = await axios.post('http://localhost:8000/auth/login', new URLSearchParams({
      username: 'test@example.com',
      password: 'password123'
    }));
    const token = loginResp.data.access_token;
    console.log("Token:", token);
    
    const url = "https://www.daraz.com.np/products/minimalist-06-retinol-serum-for-anti-aging-antioxidant-effects-with-coenzyme-q10-reduces-fine-lines-wrinkles-mid-strength-1-fl-oz-30-ml-i502138389.html";
    
    const delResp = await axios.delete('http://localhost:8000/products/save', {
      headers: { Authorization: `Bearer ${token}` },
      params: { url: url }
    });
    console.log("Delete resp:", delResp.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
test();
