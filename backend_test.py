#!/usr/bin/env python3
"""
Smart Security Monitoring System v2.0 - Backend API Testing
Tests all advanced features including risk scoring, email alerts, and enhanced APIs
"""

import requests
import json
import time
import sys
from datetime import datetime

class SecurityMonitoringTester:
    def __init__(self, base_url="https://access-control-demo-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_email = "nagaphaneendrapuranam@gmail.com"
        self.test_user_email = "user@test.com"
        
        print(f"🧪 Testing Smart Security Monitoring System v2.0")
        print(f"🌐 Backend URL: {self.base_url}")
        print(f"📧 Admin Email: {self.admin_email}")
        print("=" * 60)

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        if description:
            print(f"   📝 {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"   ✅ PASSED - Status: {response.status_code}")
                
                # Print response data for important tests
                if response.status_code in [200, 201] and response.text:
                    try:
                        resp_data = response.json()
                        if 'riskScore' in resp_data:
                            print(f"   📊 Risk Score: {resp_data['riskScore']}")
                        if 'alertTriggered' in resp_data:
                            print(f"   🚨 Alert Triggered: {resp_data['alertTriggered']}")
                        if 'role' in resp_data:
                            print(f"   👤 Role: {resp_data['role']}")
                    except:
                        pass
            else:
                print(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   📄 Response: {response.text[:200]}...")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except requests.exceptions.Timeout:
            print(f"   ⏰ TIMEOUT - Request took longer than 10 seconds")
            return False, {}
        except Exception as e:
            print(f"   ❌ ERROR - {str(e)}")
            return False, {}

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("\n" + "="*60)
        print("🌐 BASIC CONNECTIVITY TESTS")
        print("="*60)
        
        success, _ = self.run_test(
            "API Root Endpoint",
            "GET",
            "",
            200,
            description="Check if API is responding"
        )
        return success

    def test_hardcoded_admin_registration(self):
        """Test hardcoded admin email auto-assignment"""
        print("\n" + "="*60)
        print("👑 HARDCODED ADMIN TESTS")
        print("="*60)
        
        # Try to register with admin email
        success, response = self.run_test(
            "Admin Email Auto-Assignment",
            "POST",
            "auth/register",
            201,
            data={
                "email": self.admin_email,
                "password": "admin123"
            },
            description=f"Register {self.admin_email} should auto-assign ADMIN role"
        )
        
        if success and response.get('role') == 'ADMIN':
            print(f"   🎉 SUCCESS: Admin role auto-assigned!")
            return True
        elif response.get('error') == 'User already exists':
            print(f"   ℹ️  Admin user already exists (expected)")
            return True
        else:
            print(f"   ❌ FAILED: Expected ADMIN role, got {response.get('role')}")
            return False

    def test_authentication(self):
        """Test login functionality and get tokens"""
        print("\n" + "="*60)
        print("🔐 AUTHENTICATION TESTS")
        print("="*60)
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.admin_email,
                "password": "admin123"
            },
            description="Login as admin and get token"
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   🔑 Admin token acquired")
        
        # Test user login
        success2, response2 = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": "password123"
            },
            description="Login as regular user"
        )
        
        if success2 and 'token' in response2:
            self.user_token = response2['token']
            print(f"   🔑 User token acquired")
        
        return success and success2

    def test_advanced_risk_scoring(self):
        """Test advanced risk scoring with multiple failed attempts"""
        print("\n" + "="*60)
        print("🎯 ADVANCED RISK SCORING TESTS")
        print("="*60)
        
        test_email = f"risktest_{int(time.time())}@test.com"
        
        # Test 1: Multiple failed attempts (should increase risk score)
        print(f"\n📈 Testing frequency analysis with {test_email}")
        
        risk_scores = []
        for i in range(3):
            success, response = self.run_test(
                f"Failed Attempt #{i+1}",
                "POST",
                "auth/login",
                401,
                data={
                    "email": test_email,
                    "password": "wrongpassword"
                },
                description=f"Attempt {i+1} - should increase risk score"
            )
            
            if 'riskScore' in response:
                risk_scores.append(response['riskScore'])
            
            time.sleep(1)  # Small delay between attempts
        
        # Test 2: Register the user and then login (success after failures)
        self.run_test(
            "Register Test User",
            "POST",
            "auth/register",
            201,
            data={
                "email": test_email,
                "password": "testpass123"
            },
            description="Register user for failure pattern test"
        )
        
        # Test 3: Successful login after failures (should trigger high risk)
        success, response = self.run_test(
            "Success After Failures",
            "POST",
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": "testpass123"
            },
            description="Login after failures - should trigger high risk alert"
        )
        
        if success:
            final_risk = response.get('riskScore', 0)
            alert_triggered = response.get('alertTriggered', False)
            
            print(f"\n📊 Risk Score Analysis:")
            print(f"   Failed attempts scores: {risk_scores}")
            print(f"   Final success score: {final_risk}")
            print(f"   Alert triggered: {alert_triggered}")
            
            # Check if risk scoring is working
            if final_risk >= 70:
                print(f"   🎉 SUCCESS: High risk detected (≥70)!")
                return True
            elif final_risk > 30:
                print(f"   ⚠️  PARTIAL: Medium risk detected (30-70)")
                return True
            else:
                print(f"   ❌ FAILED: Risk score too low ({final_risk})")
                return False
        
        return False

    def test_enhanced_dashboard_api(self):
        """Test enhanced dashboard API with 5 metrics"""
        print("\n" + "="*60)
        print("📊 ENHANCED DASHBOARD API TESTS")
        print("="*60)
        
        if not self.admin_token:
            print("   ❌ No admin token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        success, response = self.run_test(
            "Dashboard Stats API",
            "GET",
            "activity/stats",
            200,
            headers=headers,
            description="Check if all 5 metrics are present"
        )
        
        if success:
            required_fields = [
                'totalLogins',
                'failedAttempts', 
                'highRiskLogins',
                'alertsTriggered',  # NEW field
                'suspiciousActivityCount'  # NEW field
            ]
            
            missing_fields = []
            for field in required_fields:
                if field not in response:
                    missing_fields.append(field)
            
            if not missing_fields:
                print(f"   🎉 SUCCESS: All 5 metrics present!")
                print(f"   📈 Total Logins: {response.get('totalLogins', 0)}")
                print(f"   ❌ Failed Attempts: {response.get('failedAttempts', 0)}")
                print(f"   ⚠️  High Risk: {response.get('highRiskLogins', 0)}")
                print(f"   🚨 Alerts Triggered: {response.get('alertsTriggered', 0)}")
                print(f"   🔍 Suspicious Activity: {response.get('suspiciousActivityCount', 0)}")
                
                # Check for recentHighRisk field
                if 'recentHighRisk' in response:
                    print(f"   📋 Recent High-Risk Activities: {len(response['recentHighRisk'])} items")
                
                return True
            else:
                print(f"   ❌ FAILED: Missing fields: {missing_fields}")
                return False
        
        return False

    def test_enhanced_logs_api(self):
        """Test enhanced logs API with device info and alert columns"""
        print("\n" + "="*60)
        print("📋 ENHANCED LOGS API TESTS")
        print("="*60)
        
        if not self.admin_token:
            print("   ❌ No admin token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        success, response = self.run_test(
            "Activity Logs API",
            "GET",
            "activity",
            200,
            headers=headers,
            description="Check enhanced logs with device info and alert columns"
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Check first log entry for required fields
            log_entry = response[0]
            
            required_fields = [
                'deviceInfo',  # NEW field
                'ipAddress',   # NEW field  
                'alertTriggered'  # NEW field
            ]
            
            missing_fields = []
            for field in required_fields:
                if field not in log_entry:
                    missing_fields.append(field)
            
            if not missing_fields:
                print(f"   🎉 SUCCESS: Enhanced log fields present!")
                
                # Check device info structure
                device_info = log_entry.get('deviceInfo', {})
                if isinstance(device_info, dict):
                    print(f"   🖥️  Device Info: {device_info.get('browser', 'N/A')} on {device_info.get('os', 'N/A')}")
                
                print(f"   🌐 IP Address: {log_entry.get('ipAddress', 'N/A')}")
                print(f"   🚨 Alert Triggered: {log_entry.get('alertTriggered', False)}")
                
                return True
            else:
                print(f"   ❌ FAILED: Missing enhanced fields: {missing_fields}")
                return False
        elif success:
            print(f"   ℹ️  No log entries found (empty response)")
            return True
        
        return False

    def test_user_role_restrictions(self):
        """Test that USER role cannot access admin endpoints"""
        print("\n" + "="*60)
        print("🔒 USER ROLE RESTRICTION TESTS")
        print("="*60)
        
        if not self.user_token:
            print("   ❌ No user token available")
            return False
        
        headers = {'Authorization': f'Bearer {self.user_token}'}
        
        # Test that user cannot access admin endpoints
        success1, _ = self.run_test(
            "User Access to Stats (Should Fail)",
            "GET",
            "activity/stats",
            403,
            headers=headers,
            description="USER should not access admin stats"
        )
        
        success2, _ = self.run_test(
            "User Access to Logs (Should Fail)",
            "GET",
            "activity",
            403,
            headers=headers,
            description="USER should not access activity logs"
        )
        
        return success1 and success2

    def test_device_tracking(self):
        """Test device tracking functionality"""
        print("\n" + "="*60)
        print("🖥️  DEVICE TRACKING TESTS")
        print("="*60)
        
        test_email = f"devicetest_{int(time.time())}@test.com"
        
        # Register test user
        self.run_test(
            "Register Device Test User",
            "POST",
            "auth/register",
            201,
            data={
                "email": test_email,
                "password": "testpass123"
            }
        )
        
        # Login with different User-Agent headers to simulate different devices
        headers1 = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        headers2 = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'}
        
        # First login (known device)
        success1, response1 = self.run_test(
            "Login from Device 1",
            "POST",
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": "testpass123"
            },
            headers=headers1,
            description="First login from Windows device"
        )
        
        time.sleep(1)
        
        # Second login (new device - should increase risk)
        success2, response2 = self.run_test(
            "Login from Device 2",
            "POST",
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": "testpass123"
            },
            headers=headers2,
            description="Login from iPhone device (should increase risk)"
        )
        
        if success1 and success2:
            risk1 = response1.get('riskScore', 0)
            risk2 = response2.get('riskScore', 0)
            
            print(f"\n📱 Device Tracking Results:")
            print(f"   Windows device risk: {risk1}")
            print(f"   iPhone device risk: {risk2}")
            
            if risk2 > risk1:
                print(f"   🎉 SUCCESS: New device increased risk score!")
                return True
            else:
                print(f"   ⚠️  Device tracking may not be working as expected")
                return False
        
        return False

    def run_all_tests(self):
        """Run all test suites"""
        print(f"\n🚀 Starting comprehensive backend testing...")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        test_results = []
        
        # Run test suites
        test_results.append(("Basic Connectivity", self.test_basic_connectivity()))
        test_results.append(("Hardcoded Admin", self.test_hardcoded_admin_registration()))
        test_results.append(("Authentication", self.test_authentication()))
        test_results.append(("Advanced Risk Scoring", self.test_advanced_risk_scoring()))
        test_results.append(("Enhanced Dashboard API", self.test_enhanced_dashboard_api()))
        test_results.append(("Enhanced Logs API", self.test_enhanced_logs_api()))
        test_results.append(("User Role Restrictions", self.test_user_role_restrictions()))
        test_results.append(("Device Tracking", self.test_device_tracking()))
        
        # Print final results
        print("\n" + "="*60)
        print("📊 FINAL TEST RESULTS")
        print("="*60)
        
        passed_suites = 0
        for suite_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{status} - {suite_name}")
            if result:
                passed_suites += 1
        
        print(f"\n📈 Overall Results:")
        print(f"   Test Suites: {passed_suites}/{len(test_results)} passed")
        print(f"   Individual Tests: {self.tests_passed}/{self.tests_run} passed")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if passed_suites == len(test_results):
            print(f"\n🎉 ALL TEST SUITES PASSED! System is working correctly.")
            return 0
        else:
            print(f"\n⚠️  {len(test_results) - passed_suites} test suite(s) failed. Review issues above.")
            return 1

def main():
    """Main test execution"""
    tester = SecurityMonitoringTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())