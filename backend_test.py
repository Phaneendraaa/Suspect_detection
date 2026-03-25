#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class SecurityMonitoringAPITester:
    def __init__(self, base_url="https://access-control-demo-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.user_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('error', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details if not success else "")
            
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_api_health(self):
        """Test basic API connectivity"""
        print("\n🔍 Testing API Health...")
        success, _ = self.run_test(
            "API Health Check",
            "GET",
            "/api/",
            200
        )
        return success

    def test_user_login(self):
        """Test USER login"""
        print("\n🔍 Testing USER Login...")
        success, response = self.run_test(
            "USER Login (user@test.com)",
            "POST",
            "/api/auth/login",
            200,
            data={"email": "user@test.com", "password": "password123"}
        )
        
        if success and 'token' in response:
            self.user_token = response['token']
            user_data = response.get('user', {})
            if user_data.get('role') == 'USER':
                self.log_test("USER Role Verification", True)
            else:
                self.log_test("USER Role Verification", False, f"Expected USER, got {user_data.get('role')}")
        
        return success

    def test_admin_login(self):
        """Test ADMIN login"""
        print("\n🔍 Testing ADMIN Login...")
        success, response = self.run_test(
            "ADMIN Login (admin@test.com)",
            "POST",
            "/api/auth/login",
            200,
            data={"email": "admin@test.com", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            user_data = response.get('user', {})
            if user_data.get('role') == 'ADMIN':
                self.log_test("ADMIN Role Verification", True)
            else:
                self.log_test("ADMIN Role Verification", False, f"Expected ADMIN, got {user_data.get('role')}")
        
        return success

    def test_invalid_login(self):
        """Test invalid login attempts"""
        print("\n🔍 Testing Invalid Login Attempts...")
        
        # Test wrong password
        self.run_test(
            "Invalid Password",
            "POST",
            "/api/auth/login",
            401,
            data={"email": "user@test.com", "password": "wrongpassword"}
        )
        
        # Test non-existent user
        self.run_test(
            "Non-existent User",
            "POST",
            "/api/auth/login",
            401,
            data={"email": "nonexistent@test.com", "password": "password123"}
        )
        
        # Test missing fields
        self.run_test(
            "Missing Email",
            "POST",
            "/api/auth/login",
            400,
            data={"password": "password123"}
        )

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        test_email = f"testuser_{datetime.now().strftime('%H%M%S')}@test.com"
        
        success, response = self.run_test(
            "New User Registration",
            "POST",
            "/api/auth/register",
            201,
            data={"email": test_email, "password": "testpass123"}
        )
        
        if success:
            # Test duplicate registration
            self.run_test(
                "Duplicate User Registration",
                "POST",
                "/api/auth/register",
                400,
                data={"email": test_email, "password": "testpass123"}
            )

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("\n🔍 Testing Admin Endpoints...")
        
        if not self.admin_token:
            print("❌ No admin token available for testing")
            return
        
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test activity logs
        self.run_test(
            "Get Activity Logs (Admin)",
            "GET",
            "/api/activity",
            200,
            headers=admin_headers
        )
        
        # Test activity stats
        self.run_test(
            "Get Activity Stats (Admin)",
            "GET",
            "/api/activity/stats",
            200,
            headers=admin_headers
        )
        
        # Test users list
        success, users_response = self.run_test(
            "Get Users List (Admin)",
            "GET",
            "/api/users",
            200,
            headers=admin_headers
        )
        
        # Test role update if we have users
        if success and users_response and len(users_response) > 0:
            # Find a user to test role update
            test_user = None
            for user in users_response:
                if user.get('email') != 'admin@test.com':  # Don't modify admin
                    test_user = user
                    break
            
            if test_user:
                current_role = test_user.get('role')
                new_role = 'ADMIN' if current_role == 'USER' else 'USER'
                
                self.run_test(
                    f"Update User Role ({current_role} -> {new_role})",
                    "PUT",
                    f"/api/users/{test_user['_id']}/role",
                    200,
                    data={"role": new_role},
                    headers=admin_headers
                )

    def test_unauthorized_access(self):
        """Test unauthorized access to admin endpoints"""
        print("\n🔍 Testing Unauthorized Access...")
        
        # Test without token
        self.run_test(
            "Activity Logs (No Token)",
            "GET",
            "/api/activity",
            401
        )
        
        # Test with user token (should fail for admin endpoints)
        if self.user_token:
            user_headers = {'Authorization': f'Bearer {self.user_token}'}
            
            self.run_test(
                "Activity Logs (USER Token)",
                "GET",
                "/api/activity",
                403,
                headers=user_headers
            )
            
            self.run_test(
                "Users List (USER Token)",
                "GET",
                "/api/users",
                403,
                headers=user_headers
            )

    def test_invalid_tokens(self):
        """Test invalid token handling"""
        print("\n🔍 Testing Invalid Tokens...")
        
        invalid_headers = {'Authorization': 'Bearer invalid_token_here'}
        
        self.run_test(
            "Invalid Token",
            "GET",
            "/api/activity",
            403,
            headers=invalid_headers
        )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Security Monitoring API Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_api_health():
            print("❌ API health check failed. Stopping tests.")
            return False
        
        # Authentication tests
        self.test_user_login()
        self.test_admin_login()
        self.test_invalid_login()
        self.test_user_registration()
        
        # Authorization tests
        self.test_admin_endpoints()
        self.test_unauthorized_access()
        self.test_invalid_tokens()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = SecurityMonitoringAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())