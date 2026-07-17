#!/usr/bin/env node

/**
 * ProfilePays Authentication API Test Script
 *
 * This script tests all the authentication endpoints to verify the system works correctly.
 * Run this after starting the server to test the API functionality.
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:3000/api/v1';

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'John',
  lastName: 'Doe',
  userRole: 'member'
};

let accessToken = '';
let refreshToken = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testSignup() {
  console.log('🔐 Testing User Signup...');

  try {
    const response = await makeRequest('POST', '/auth/signup', testUser);

    if (response.status === 201) {
      console.log('✅ Signup successful');
      console.log('   User:', response.data.user.email);
      console.log('   Role:', response.data.user.userRole);
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
      return true;
    } else {
      console.log('❌ Signup failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Signup error:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('🔐 Testing User Login...');

  try {
    const loginData = {
      email: testUser.email,
      password: testUser.password
    };

    const response = await makeRequest('POST', '/auth/login', loginData);

    if (response.status === 200) {
      console.log('✅ Login successful');
      console.log('   User:', response.data.user.email);
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
      return true;
    } else {
      console.log('❌ Login failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

async function testGetProfile() {
  console.log('👤 Testing Get Profile...');

  try {
    const response = await makeRequest('GET', '/users/me', null, accessToken);

    if (response.status === 200) {
      console.log('✅ Get profile successful');
      console.log('   Name:', response.data.firstName, response.data.lastName);
      console.log('   Email:', response.data.email);
      return true;
    } else {
      console.log('❌ Get profile failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Get profile error:', error.message);
    return false;
  }
}

async function testUpdateProfile() {
  console.log('✏️ Testing Update Profile...');

  try {
    const updateData = {
      firstName: 'Jane',
      phoneNumber: '+1-555-0123'
    };

    const response = await makeRequest('PUT', '/users/me', updateData, accessToken);

    if (response.status === 200) {
      console.log('✅ Update profile successful');
      console.log('   Updated name:', response.data.firstName);
      console.log('   Phone:', response.data.phoneNumber);
      return true;
    } else {
      console.log('❌ Update profile failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Update profile error:', error.message);
    return false;
  }
}

async function testRefreshToken() {
  console.log('🔄 Testing Token Refresh...');

  try {
    const refreshData = { refreshToken: refreshToken };
    const response = await makeRequest('POST', '/auth/refresh', refreshData);

    if (response.status === 200) {
      console.log('✅ Token refresh successful');
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
      return true;
    } else {
      console.log('❌ Token refresh failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Token refresh error:', error.message);
    return false;
  }
}

async function testLogout() {
  console.log('🚪 Testing Logout...');

  try {
    const response = await makeRequest('POST', '/auth/logout', null, accessToken);

    if (response.status === 200) {
      console.log('✅ Logout successful');
      return true;
    } else {
      console.log('❌ Logout failed:', response.status, response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Logout error:', error.message);
    return false;
  }
}

async function testInvalidLogin() {
  console.log('🚫 Testing Invalid Login...');

  try {
    const loginData = {
      email: testUser.email,
      password: 'WrongPassword123!'
    };

    const response = await makeRequest('POST', '/auth/login', loginData);

    if (response.status === 401) {
      console.log('✅ Invalid login properly rejected');
      return true;
    } else {
      console.log('❌ Invalid login not properly rejected:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Invalid login test error:', error.message);
    return false;
  }
}

async function testProtectedRouteWithoutToken() {
  console.log('🔒 Testing Protected Route Without Token...');

  try {
    const response = await makeRequest('GET', '/users/me', null, null);

    if (response.status === 401) {
      console.log('✅ Protected route properly secured');
      return true;
    } else {
      console.log('❌ Protected route not properly secured:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Protected route test error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 ProfilePays Authentication API Test Suite');
  console.log('===============================================\n');

  const tests = [
    { name: 'User Signup', fn: testSignup },
    { name: 'User Login', fn: testLogin },
    { name: 'Get Profile', fn: testGetProfile },
    { name: 'Update Profile', fn: testUpdateProfile },
    { name: 'Token Refresh', fn: testRefreshToken },
    { name: 'Protected Route Security', fn: testProtectedRouteWithoutToken },
    { name: 'Invalid Login Rejection', fn: testInvalidLogin },
    { name: 'User Logout', fn: testLogout }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" threw error:`, error.message);
      failed++;
    }
    console.log(); // Empty line for readability
  }

  console.log('===============================================');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Authentication system is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Check the server logs and configuration.');
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await makeRequest('GET', '/auth/me');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm run start:dev');
    return false;
  }
}

// Run the tests
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
})();