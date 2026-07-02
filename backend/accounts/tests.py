from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase


class AuthenticationTests(APITestCase):
    password = 'Str0ng!TestingPass2026'

    def csrf_client(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.get(reverse('auth-csrf'))
        return client, response.json()['csrfToken']

    def registration_data(self, **overrides):
        data = {
            'username': 'juan',
            'email': 'juan@example.com',
            'password': self.password,
            'password_confirm': self.password,
        }
        data.update(overrides)
        return data

    def create_user(self):
        return User.objects.create_user(
            username='juan',
            email='juan@example.com',
            password=self.password,
        )

    def post_with_csrf(self, client, url_name, data, token):
        return client.post(
            reverse(url_name),
            data,
            format='json',
            HTTP_X_CSRFTOKEN=token,
        )

    def test_registration_succeeds_and_hashes_password(self):
        client, token = self.csrf_client()
        response = self.post_with_csrf(
            client,
            'auth-register',
            self.registration_data(),
            token,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'juan')
        user = User.objects.get(username='juan')
        self.assertTrue(user.check_password(self.password))
        self.assertNotEqual(user.password, self.password)

    def test_registration_rejects_duplicate_username_case_insensitively(self):
        self.create_user()
        client, token = self.csrf_client()
        response = self.post_with_csrf(
            client,
            'auth-register',
            self.registration_data(username='JUAN'),
            token,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_registration_rejects_password_mismatch(self):
        client, token = self.csrf_client()
        response = self.post_with_csrf(
            client,
            'auth-register',
            self.registration_data(password_confirm='DifferentPass2026!'),
            token,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)

    def test_registration_rejects_weak_password(self):
        client, token = self.csrf_client()
        response = self.post_with_csrf(
            client,
            'auth-register',
            self.registration_data(password='password', password_confirm='password'),
            token,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_succeeds_and_creates_session(self):
        user = self.create_user()
        client, token = self.csrf_client()
        response = self.post_with_csrf(
            client,
            'auth-login',
            {'username': user.username, 'password': self.password},
            token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], user.id)
        self.assertEqual(int(client.session['_auth_user_id']), user.id)

    def test_login_rejects_missing_credentials(self):
        client, token = self.csrf_client()
        response = self.post_with_csrf(client, 'auth-login', {}, token)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_rejects_invalid_credentials(self):
        self.create_user()
        client, token = self.csrf_client()
        response = self.post_with_csrf(
            client,
            'auth-login',
            {'username': 'juan', 'password': 'wrong-password'},
            token,
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user(self):
        user = self.create_user()
        self.client.force_login(user)
        response = self.client.get(reverse('auth-me'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], user.id)

    def test_me_rejects_anonymous_user(self):
        response = self.client.get(reverse('auth-me'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_destroys_session(self):
        user = self.create_user()
        client, token = self.csrf_client()
        login_response = self.post_with_csrf(
            client,
            'auth-login',
            {'username': user.username, 'password': self.password},
            token,
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        csrf_response = client.get(reverse('auth-csrf'))
        token = csrf_response.json()['csrfToken']
        response = self.post_with_csrf(client, 'auth-logout', {}, token)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertNotIn('_auth_user_id', client.session)

    def test_session_changing_endpoints_require_csrf(self):
        user = self.create_user()
        client = APIClient(enforce_csrf_checks=True)

        register_response = client.post(
            reverse('auth-register'),
            self.registration_data(username='maria', email='maria@example.com'),
            format='json',
        )
        login_response = client.post(
            reverse('auth-login'),
            {'username': user.username, 'password': self.password},
            format='json',
        )
        client.force_login(user)
        logout_response = client.post(reverse('auth-logout'), {}, format='json')

        self.assertEqual(register_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(login_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(logout_response.status_code, status.HTTP_403_FORBIDDEN)
