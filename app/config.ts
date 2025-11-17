// config.ts
const Config = {
  // For development - change this to your computer's IP address
  // Example: 'http://192.168.1.100:5000/api'
  API_BASE_URL: 'http://172.20.10.2:5000/api', // ← CHANGE THIS TO YOUR IP
  
  // Or use dynamic detection
  // API_BASE_URL: __DEV__ 
  //   ? 'http://localhost:5000/api'  // For simulator
  //   : 'http://YOUR_COMPUTER_IP:5000/api', // For physical device
};

export default Config;