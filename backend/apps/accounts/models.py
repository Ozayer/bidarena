from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'super_admin', 'Super Admin'
        TOURNAMENT_ADMIN = 'tournament_admin', 'Tournament Admin'
        TEAM_OWNER = 'team_owner', 'Team Owner'

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.TEAM_OWNER)
    phone_number = models.CharField(max_length=32, blank=True)

    def __str__(self):
        return self.username
