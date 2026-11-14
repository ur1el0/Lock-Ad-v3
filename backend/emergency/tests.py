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
