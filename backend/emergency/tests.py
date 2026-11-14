from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from emergency.models import EmergencyContact


class EmergencyContactPermissionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='contact-owner', password='password123')
        self.other_user = User.objects.create_user(username='other-user', password='password123')
        self.admin = User.objects.create_user(
            username='contact-admin',
            password='password123',
            is_staff=True,
        )
        self.contact = EmergencyContact.objects.create(
            user=self.owner,
            name='Trusted Contact',
            phone_number='555-0100',
            relationship='Friend',
        )
        self.list_url = reverse('emergencycontact-list')
        self.detail_url = reverse('emergencycontact-detail', args=[self.contact.pk])

    def test_users_only_list_their_own_contacts(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 0)

    def test_non_admin_cannot_delete_even_an_owned_contact(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(EmergencyContact.objects.filter(pk=self.contact.pk).exists())

    def test_admin_can_delete_contact(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(EmergencyContact.objects.filter(pk=self.contact.pk).exists())

    def test_create_assigns_contact_to_requesting_user(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(self.list_url, {
            'name': 'Another Contact',
            'phone_number': '555-0101',
            'relationship': 'Sibling',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            EmergencyContact.objects.get(pk=response.data['id']).user,
            self.owner,
        )

    def test_user_cannot_create_more_than_three_contacts(self):
        self.client.force_authenticate(user=self.owner)
        payload = {
            'name': 'Additional Contact',
            'phone_number': '555-0101',
            'relationship': 'Friend',
        }

        for _ in range(2):
            response = self.client.post(self.list_url, payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'You can save up to 3 emergency contacts.',
        )
        self.assertEqual(
            EmergencyContact.objects.filter(user=self.owner).count(),
            3,
        )

    def test_emergency_contact_limit_is_per_user(self):
        EmergencyContact.objects.create(
            user=self.owner,
            name='Second Contact',
            phone_number='555-0102',
            relationship='Friend',
        )
        EmergencyContact.objects.create(
            user=self.owner,
            name='Third Contact',
            phone_number='555-0103',
            relationship='Friend',
        )
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(self.list_url, {
            'name': 'Other User Contact',
            'phone_number': '555-0104',
            'relationship': 'Family',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            EmergencyContact.objects.filter(user=self.other_user).count(),
            1,
        )
